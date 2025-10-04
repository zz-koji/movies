import { spawn } from 'child_process';
import { basename, dirname, extname, join } from 'path';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { GetMoviesDto, GetMovieDto } from './types'
import { Client as MinioClient } from 'minio'
import { Database } from 'src/database/types';
import { Kysely } from 'kysely';
import { unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import type { Readable } from 'stream';

interface MovieStreamResponse {
  status: number;
  headers: Record<string, string>;
  stream: Readable | null;
}

interface RangeBounds {
  start: number;
  end: number;
}


@Injectable()
export class MoviesService {
  private static readonly STREAM_CHUNK_SIZE = 1_000_000; // ~1MB default range window
  private apiKey: string;
  private apiUrl: string;
  private bucket: string = 'movies';
  private readonly ffmpegBinary: string;
  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService, @Inject('MINIO_CLIENT') private readonly minioClient: MinioClient, @Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>) {
    this.apiKey = this.configService.getOrThrow('MOVIES_API_KEY')
    this.apiUrl = this.configService.getOrThrow('MOVIES_API_URL')
    const configuredBinary = this.configService.get('FFMPEG_PATH')
    this.ffmpegBinary = configuredBinary ?? process.env.FFMPEG_PATH ?? 'ffmpeg'
  }

  private buildQuery(args: { param: string, value: string | number | undefined | null }[]): string {
    const params = new URLSearchParams({ apiKey: this.apiKey })

    for (const { param, value } of args) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(param, String(value))
      }
    }

    return `?${params.toString()}`
  }

  async getMovies({ title, page = 1 }: GetMoviesDto) {
    const query = this.buildQuery([{
      param: "s", value: title
    }, { param: "page", value: page }])
    return this.httpService.get(`${this.apiUrl}/${query}`).pipe(map(response => response.data)
    )
  }

  getMovie({ id, title }: GetMovieDto) {
    const query = this.buildQuery([{ param: "i", value: id }, { param: "t", value: title }])
    return this.httpService.get(`${this.apiUrl}/${query}`).pipe(map(response => response.data))
  }

  async uploadMovie(movie: Express.Multer.File, omdbMovieId: string) {
    const fileName = movie.originalname.toLowerCase();
    const mimetype = movie.mimetype;

    let processedPath = movie.path;
    let fastStartPath: string | null = null;
    let uploadCompleted = false;

    try {
      fastStartPath = await this.convertToFastStart(movie.path);
      processedPath = fastStartPath;
    } catch (error) {
      await unlink(movie.path).catch(() => undefined);
      throw new BadRequestException(`Unable to prepare video for streaming: ${error instanceof Error ? error.message : error}`);
    }

    try {
      const fileStream = createReadStream(processedPath);
      const result = await this.minioClient.putObject(
        this.bucket,
        fileName,
        fileStream,
        undefined,
        { 'Content-Type': mimetype },
      );
      uploadCompleted = true;

      const omdbMovie = await lastValueFrom(
        this.getMovie({ id: omdbMovieId })
      );
      const recordUpload = await this.db.insertInto('local_movies').values({
        description: omdbMovie.Plot,
        movie_file_key: fileName,
        title: omdbMovie.Title,
        omdb_id: omdbMovie.imdbID,
      }).returningAll().executeTakeFirst();

      return { upload: result, movie: recordUpload };
    } catch (error) {
      if (uploadCompleted) {
        await this.minioClient.removeObject(this.bucket, fileName).catch(() => undefined);
      }
      throw new BadRequestException(`Upload failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      await unlink(movie.path).catch(() => undefined);
      if (fastStartPath) {
        await unlink(fastStartPath).catch(() => undefined);
      }
    }
  }

  private async getMovieFileKey(omdbMovieId: string) {
    const movie = await this.db
      .selectFrom('local_movies')
      .where('omdb_id', '=', omdbMovieId)
      .select('local_movies.movie_file_key')
      .executeTakeFirstOrThrow(() => new NotFoundException('Request movie is not found.'))

    return movie.movie_file_key
  }

  async streamMovie(omdbMovieId: string) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.getObject(this.bucket, movieFileKey)
  }

  async streamMovieRange(omdbMovieId: string, start: number, length: number) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.getPartialObject(this.bucket, movieFileKey, start, length)
  }

  async createStreamResponse(omdbMovieId: string, rangeHeader?: string): Promise<MovieStreamResponse> {
    const movieStats = await this.getMovieStats(omdbMovieId)
    const fileSize = movieStats.size
    const contentType = movieStats.metaData?.['content-type'] ?? 'application/octet-stream'

    const baseHeaders = {
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
    }

    if (!rangeHeader) {
      const stream = await this.streamMovie(omdbMovieId)
      return {
        status: HttpStatus.OK,
        headers: {
          ...baseHeaders,
          'Content-Length': String(fileSize),
        },
        stream,
      }
    }

    const range = MoviesService.parseRangeHeader(rangeHeader, fileSize)

    if (!range) {
      return {
        status: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${fileSize}`,
        },
        stream: null,
      }
    }

    const { start, end } = range
    const chunkSize = end - start + 1

    const stream = await this.streamMovieRange(omdbMovieId, start, chunkSize)

    return {
      status: HttpStatus.PARTIAL_CONTENT,
      headers: {
        ...baseHeaders,
        'Content-Length': String(chunkSize),
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      },
      stream,
    }
  }

  private static parseRangeHeader(rangeHeader: string, fileSize: number): RangeBounds | null {
    // Match Range headers such as `bytes=0-500`; capture groups hold the start/end digits.
    const matches = /bytes=(\d*)-(\d*)/i.exec(rangeHeader)

    if (!matches) {
      return null
    }

    // Extract the start and end ranges from matches.
    // First element represents the entire matched string. i.e. bytes=0-500
    // The following elements are the matched (group) strings. 0, 500
    const [, rawStart, rawEnd] = matches


    const hasStart = rawStart !== ''
    const hasEnd = rawEnd !== ''

    if (!hasStart && !hasEnd) {
      return null
    }

    let start = hasStart ? Number.parseInt(rawStart, 10) : NaN
    let end = hasEnd ? Number.parseInt(rawEnd, 10) : NaN

    if ((hasStart && Number.isNaN(start)) || (hasEnd && Number.isNaN(end))) {
      return null
    }

    // Suffix-byte range (`bytes=-N`)
    if (!hasStart && hasEnd) {
      // `end` now represents the suffix length (last N bytes). Clamp so invalid negatives become 0.
      const suffixLength = Math.max(end, 0)
      if (suffixLength === 0) {
        return null
      }

      // Start streaming from `fileSize - suffixLength` (e.g. bytes=-500 -> start=1000, end=1499).
      const suffixStart = Math.max(fileSize - suffixLength, 0)
      return { start: suffixStart, end: fileSize - 1 }
    }

    // At this point we have a starting position.
    start = Math.min(Math.max(start, 0), Math.max(fileSize - 1, 0))

    if (!hasEnd) {
      // Open-ended range: stream a bounded window starting from `start`.
      const computedEnd = start + MoviesService.STREAM_CHUNK_SIZE - 1
      return { start, end: Math.min(computedEnd, Math.max(fileSize - 1, 0)) }
    }

    end = Math.min(end, Math.max(fileSize - 1, 0))

    if (start > end) {
      return null
    }

    return { start, end }
  }

  async getLocalMovies() {
    return await this.db.selectFrom('local_movies').selectAll().execute()
  }

  async getMovieStats(omdbMovieId: string) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.statObject(this.bucket, movieFileKey)
  }

  private async convertToFastStart(sourcePath: string): Promise<string> {
    // Build file variables.
    const extension = extname(sourcePath) || '.mp4';
    const baseName = basename(sourcePath, extension);
    const directory = dirname(sourcePath);
    const targetPath = join(directory, `${baseName}.faststart${extension}`);

    await new Promise<void>((resolve, reject) => {
      // Re-mux the upload with `+faststart` so metadata is available before the full download finishes.

      const ffmpeg = spawn(this.ffmpegBinary, ['-y', '-i', sourcePath, '-c', 'copy', '-movflags', '+faststart', targetPath]);
      let stderr = '';

      // Listen for ffmpeg errors.
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });

      // Capture ffmpeg stderr for detailed error messages.
      ffmpeg.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      // Resolve on success; ensure the temp target is removed if encoding fails.
      ffmpeg.on('close', async (code) => {
        if (code === 0) {
          resolve();
        } else {
          await unlink(targetPath).catch(() => undefined);
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`));
        }
      });
    });

    return targetPath;
  }
}
