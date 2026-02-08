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
      // Optimized software encoding (ultrafast preset + multi-threading)
      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-threads', '0',
        '-profile:v', 'high',
        '-pix_fmt', 'yuv420p'
      );
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
}
