import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { unlink } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';

@Injectable()
export class FfmpegService {
  private ffmpegBinary: string;

  constructor(private readonly configService: ConfigService) {
    this.ffmpegBinary = this.configService.get('FFMPEG_PATH') ?? 'ffmpeg';
  }

  // Video file encoding "+faststart" that makes metadata available before full download finishes.
  async convertToFastStart(sourcePath: string): Promise<string> {
    const extension = extname(sourcePath) || '.mp4';
    const baseName = basename(sourcePath, extension);
    const directory = dirname(sourcePath);
    const targetPath = join(directory, `${baseName}.faststart${extension}`);

    await new Promise<void>((resolve, reject) => {
      // Re-mux the upload with `+faststart` so metadata is available before the full download finishes.

      const ffmpeg = spawn(this.ffmpegBinary, [
        '-y',
        '-i',
        sourcePath,
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        targetPath,
      ]);
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
