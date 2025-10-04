import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { GetMoviesDto, GetMovieDto, OmdbMovie, LocalMovie } from './types'
import { UploadMovieDto } from './types/dto/upload-movie.dto';
import { Client as MinioClient } from 'minio'
import { Database } from 'src/database/types';
import { extname } from 'path';
import { Kysely } from 'kysely';
import { unlink } from 'fs/promises';
import { createReadStream } from 'fs';


@Injectable()
export class MoviesService {
  private apiKey: string;
  private apiUrl: string;
  private bucket: string = 'movies';
  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService, @Inject('MINIO_CLIENT') private readonly minioClient: MinioClient, @Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>) {
    this.apiKey = this.configService.getOrThrow('MOVIES_API_KEY')
    this.apiUrl = this.configService.getOrThrow('MOVIES_API_URL')
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
    const fileStream = createReadStream(movie.path);

    try {
      const result = await this.minioClient.putObject(
        this.bucket,
        fileName,
        fileStream,
        undefined, // optional for streams, may omit
        { 'Content-Type': mimetype },
      );

      await unlink(movie.path)

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
      await this.minioClient.removeObject(this.bucket, fileName);
      console.log(error)
      throw new BadRequestException(`Upload failed: ${error}`);
    }
  }

  async streamMovie(omdbMovieId: string) {
    const movie = await this.db.selectFrom('local_movies').where('omdb_id', '=', omdbMovieId).select('local_movies.movie_file_key').executeTakeFirstOrThrow(() => { throw new NotFoundException('Request movie is not found.') })
    return await this.minioClient.getObject(this.bucket, movie.movie_file_key)
  }

  async getMovieStats(omdbMovieId: string) {
    const movie = await this.db.selectFrom('local_movies').where('omdb_id', '=', omdbMovieId).select('local_movies.movie_file_key').executeTakeFirstOrThrow()
    return await this.minioClient.statObject(this.bucket, movie.movie_file_key)
  }
}
