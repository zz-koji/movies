import { spawn } from 'child_process';
import { basename, dirname, extname, join } from 'path';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { GetMoviesDto, GetMovieDto } from './types'
import { Client as MinioClient } from 'minio'
import { Database } from 'src/database/types';
import { Kysely } from 'kysely';
import { unlink } from 'fs/promises';
import { createReadStream } from 'fs';


@Injectable()
export class MoviesService {
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

  private buildQuery(args: { param: string, value: string | number | undefined }[]): string {
    let query: string = `?apiKey=${this.apiKey}`;

    for (const queryPair of args) {
      const param = queryPair['param']
      const value = queryPair['value']

      if (value) query = query + `&${param}=${value}`
    }

    return query
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

  async getLocalMovies() {
    return await this.db.selectFrom('local_movies').selectAll().execute()
  }

  async getMovieStats(omdbMovieId: string) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.statObject(this.bucket, movieFileKey)
  }

  private async convertToFastStart(sourcePath: string): Promise<string> {
    const extension = extname(sourcePath) || '.mp4';
    const baseName = basename(sourcePath, extension);
    const directory = dirname(sourcePath);
    const targetPath = join(directory, `${baseName}.faststart${extension}`);

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegBinary, ['-y', '-i', sourcePath, '-c', 'copy', '-movflags', '+faststart', targetPath]);
      let stderr = '';

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });

      ffmpeg.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

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
