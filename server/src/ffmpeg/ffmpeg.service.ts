import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { unlink } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';

interface CodecInfo {
  videoCodec: string | null;
  audioCodec: string | null;
}

interface TranscodeStrategy {
  videoAction: 'copy' | 'transcode';
  audioAction: 'copy' | 'transcode';
}

interface SubtitleStream {
  index: number;
  codecName: string;
  language?: string;
}

@Injectable()
export class FfmpegService {
  private ffmpegBinary: string;
  private ffprobeBinary: string;

  constructor(private readonly configService: ConfigService) {
    this.ffmpegBinary = this.configService.get('FFMPEG_PATH') ?? 'ffmpeg';
    this.ffprobeBinary = this.configService.get('FFPROBE_PATH') ?? 'ffprobe';
  }

  private async probeCodecs(sourcePath: string): Promise<CodecInfo> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(this.ffprobeBinary, [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=codec_name',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        sourcePath,
      ]);

      const ffprobeAudio = spawn(this.ffprobeBinary, [
        '-v',
        'error',
        '-select_streams',
        'a:0',
        '-show_entries',
        'stream=codec_name',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        sourcePath,
      ]);

      let videoCodec = '';
      let audioCodec = '';

      ffprobe.stdout?.on('data', (chunk) => {
        videoCodec += chunk.toString().trim();
      });

      ffprobeAudio.stdout?.on('data', (chunk) => {
        audioCodec += chunk.toString().trim();
      });

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve({
            videoCodec: videoCodec || null,
            audioCodec: audioCodec || null,
          });
        }
      };

      ffprobe.on('close', checkComplete);
      ffprobeAudio.on('close', checkComplete);

      ffprobe.on('error', reject);
      ffprobeAudio.on('error', reject);
    });
  }

  private determineTranscodeStrategy(codecInfo: CodecInfo): TranscodeStrategy {
    const browserCompatibleVideoCodecs = ['h264', 'avc'];
    const browserCompatibleAudioCodecs = ['aac', 'mp3'];

    const videoAction = codecInfo.videoCodec &&
      browserCompatibleVideoCodecs.includes(codecInfo.videoCodec.toLowerCase())
      ? 'copy'
      : 'transcode';

    const audioAction = codecInfo.audioCodec &&
      browserCompatibleAudioCodecs.includes(codecInfo.audioCodec.toLowerCase())
      ? 'copy'
      : 'transcode';

    return { videoAction, audioAction };
  }

  private getHardwareEncoder(): 'h264_vaapi' | 'h264_qsv' | 'h264_nvenc' | null {
    // Use VA-API with Intel iHD driver for Intel Arc GPUs
    // Confirmed working with Intel Arc 130V/140V (Lunar Lake)

    try {
      const fs = require('fs');
      if (fs.existsSync('/dev/dri/renderD128')) {
        // VA-API with Intel iHD driver v24.3.4
        return 'h264_vaapi';
      }
    } catch (error) {
      console.log('Hardware encoding not available, using software fallback');
    }

    return null;
  }

  // Video file encoding "+faststart" that makes metadata available before full download finishes.
  async convertToFastStart(sourcePath: string): Promise<string> {
    const extension = extname(sourcePath) || '.mp4';
    const baseName = basename(sourcePath, extension);
    const directory = dirname(sourcePath);
    const targetPath = join(directory, `${baseName}.faststart.mp4`);

    // Probe source codecs to determine what needs transcoding
    const codecInfo = await this.probeCodecs(sourcePath);
    const strategy = this.determineTranscodeStrategy(codecInfo);

    // Build ffmpeg arguments based on strategy
    const ffmpegArgs = ['-y', '-i', sourcePath];

    // Video encoding
    if (strategy.videoAction === 'copy') {
      ffmpegArgs.push('-c:v', 'copy');
    } else {
      // Try hardware acceleration first (10x faster than software)
      // Priority: VAAPI (best compatibility) > QSV (Intel) > NVENC (NVIDIA)
      // Falls back to software if hardware encoding fails
      const hwEncoder = this.getHardwareEncoder();

      if (hwEncoder === 'h264_vaapi') {
        // VA-API (Intel/AMD GPU acceleration)
        // Using qp 28 for good quality with smaller file sizes
        // (qp 23 was creating files larger than HEVC input)
        ffmpegArgs.push(
          '-vaapi_device', '/dev/dri/renderD128',
          '-vf', 'format=nv12,hwupload',
          '-c:v', 'h264_vaapi',
          '-qp', '28',
          '-profile:v', 'high'
        );
      } else if (hwEncoder === 'h264_qsv') {
        // Intel Quick Sync Video
        ffmpegArgs.push(
          '-c:v', 'h264_qsv',
          '-preset', 'fast',
          '-global_quality', '23',
          '-profile:v', 'high',
          '-pix_fmt', 'yuv420p'
        );
      } else if (hwEncoder === 'h264_nvenc') {
        // NVIDIA NVENC
        ffmpegArgs.push(
          '-c:v', 'h264_nvenc',
          '-preset', 'fast',
          '-cq', '23',
          '-profile:v', 'high',
          '-pix_fmt', 'yuv420p'
        );
      } else {
        // Software fallback (if no hardware available or hardware encoding fails)
        ffmpegArgs.push(
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '23',
          '-threads', '0',
          '-profile:v', 'high',
          '-pix_fmt', 'yuv420p'
        );
      }
    }

    // Audio encoding
    if (strategy.audioAction === 'copy') {
      ffmpegArgs.push('-c:a', 'copy');
    } else {
      // Downmix to stereo for browser compatibility
      ffmpegArgs.push('-c:a', 'aac', '-ac', '2', '-b:a', '128k');
    }

    // Always add faststart for streaming
    ffmpegArgs.push('-movflags', '+faststart', targetPath);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegBinary, ffmpegArgs);
      let stderr = '';

      // Listen for ffmpeg errors.
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });

      // Capture ffmpeg stderr for detailed error messages.
      ffmpeg.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          resolve();
        } else {
          await unlink(targetPath).catch(() => undefined);
          reject(
            new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`),
          );
        }
      });
    });

    return targetPath;
  }

  async probeSubtitleStreams(sourcePath: string): Promise<SubtitleStream[]> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn(this.ffprobeBinary, [
        '-v',
        'error',
        '-select_streams',
        's',
        '-show_entries',
        'stream=index,codec_name:stream_tags=language',
        '-of',
        'json',
        sourcePath,
      ]);

      let stdout = '';
      let stderr = '';

      ffprobe.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      ffprobe.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          const streams: SubtitleStream[] = [];

          if (result.streams && Array.isArray(result.streams)) {
            for (const stream of result.streams) {
              streams.push({
                index: stream.index,
                codecName: stream.codec_name,
                language: stream.tags?.language,
              });
            }
          }

          resolve(streams);
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error}`));
        }
      });

      ffprobe.on('error', reject);
    });
  }

  async extractSubtitleToSrt(
    sourcePath: string,
    streamIndex: number,
    outputPath: string,
  ): Promise<string> {
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegBinary, [
        '-y',
        '-i',
        sourcePath,
        '-map',
        `0:${streamIndex}`,
        '-c:s',
        'srt',
        outputPath,
      ]);

      let stderr = '';

      ffmpeg.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          resolve();
        } else {
          await unlink(outputPath).catch(() => undefined);
          reject(
            new Error(
              `FFmpeg subtitle extraction failed with code ${code}: ${stderr.trim()}`,
            ),
          );
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });

    return outputPath;
  }
}
