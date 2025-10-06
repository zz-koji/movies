import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { GetMovieDto, GetMoviesDto, OmdbMovie, omdbMovieSchema } from 'src/movies/types';

@Injectable()
export class OmdbApiService {
  private apiKey: string;
  private apiUrl: string;
  constructor(
    private readonly httpService: HttpService, private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.getOrThrow('MOVIES_API_KEY')
    this.apiUrl = this.configService.getOrThrow('MOVIES_API_URL')
  }

  private buildQuery(args: { param: string, value: string | number | undefined | null }[]): string {
    const params = new URLSearchParams({ apikey: this.apiKey })

    for (const { param, value } of args) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(param, String(value))
      }
    }

    return `?${params.toString()}`
  }

  async getMovies({ title, page = 1 }: GetMoviesDto) {
    const query = this.buildQuery([
      { param: "s", value: title },
      { param: "page", value: page },
    ])

    const request = this.httpService
      .get(`${this.apiUrl}/${query}`)
      .pipe(map((response) => response.data))

    return await lastValueFrom(request)
  }

  private async fetchMovieFromOmdb({ id, title }: GetMovieDto) {
    const query = this.buildQuery([
      { param: "i", value: id },
      { param: "t", value: title },
    ])

    const request = this.httpService
      .get(`${this.apiUrl}/${query}`)
      .pipe(map((response) => response.data))

    return await lastValueFrom(request)
  }

  async getOmdbMovie(param: GetMovieDto) {


    const movie = await this.fetchMovieFromOmdb(param)
    return movie
  }

  isSuccessfulOmdbRequest(payload: unknown): payload is OmdbMovie {
    return omdbMovieSchema.safeParse(payload).success
  }
}
