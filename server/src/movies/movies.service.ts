import { spawn } from 'child_process';
import { basename, dirname, extname, join } from 'path';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, HttpStatus, Inject, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, map } from 'rxjs';
import { GetMoviesDto, GetMovieDto, GetLocalMoviesDto, LocalMovie, MovieMetadata, MovieMetadataInsert, OmdbMovie, omdbMovieSchema } from './types'
import { Client as MinioClient } from 'minio'
import { Database } from 'src/database/types';
import { Kysely, sql } from 'kysely';
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

    const request$ = this.httpService
      .get(`${this.apiUrl}/${query}`)
      .pipe(map((response) => response.data))

    return await lastValueFrom(request$)
  }

  private async fetchMovieFromOmdb({ id, title }: GetMovieDto) {
    const query = this.buildQuery([
      { param: "i", value: id },
      { param: "t", value: title },
    ])

    const request$ = this.httpService
      .get(`${this.apiUrl}/${query}`)
      .pipe(map((response) => response.data))

    return await lastValueFrom(request$)
  }

  async getMovie(param: GetMovieDto) {
    if (param.id) {
      const cached = await this.getMovieMetadataRow(param.id)
      if (cached?.data) {
        return cached.data
      }
    }

    const movie = await this.fetchMovieFromOmdb(param)

    if (MoviesService.isSuccessfulOmdbMovie(movie)) {
      await this.upsertMovieMetadata(movie)
    }

    return movie
  }

  private async getMovieMetadataRow(omdbId: string): Promise<MovieMetadata | undefined> {
    return await this.db
      .selectFrom('movie_metadata')
      .selectAll()
      .where('omdb_id', '=', omdbId)
      .executeTakeFirst()
  }

  private static isSuccessfulOmdbMovie(payload: unknown): payload is OmdbMovie {
    return omdbMovieSchema.safeParse(payload).success
  }

  private static parseYear(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const parsed = Number.parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  private static parseRuntimeMinutes(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const match = value.match(/(\d+)/)
    if (!match) {
      return null
    }

    const minutes = Number.parseInt(match[1] ?? '', 10)
    return Number.isNaN(minutes) ? null : minutes
  }

  private static parseImdbRating(value?: string | null): number | null {
    if (!value) {
      return null
    }

    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  private static buildMetadataRecord(movie: OmdbMovie): MovieMetadataInsert {
    return {
      omdb_id: movie.imdbID,
      title: movie.Title,
      year: MoviesService.parseYear(movie.Year),
      genre: movie.Genre || null,
      director: movie.Director || null,
      actors: movie.Actors || null,
      imdb_rating: MoviesService.parseImdbRating(movie.imdbRating),
      runtime: MoviesService.parseRuntimeMinutes(movie.Runtime),
      data: movie,
    }
  }

  private async upsertMovieMetadata(movie: OmdbMovie) {
    const record = MoviesService.buildMetadataRecord(movie)

    await this.db
      .insertInto('movie_metadata')
      .values(record)
      .onConflict((oc) =>
        oc.column('omdb_id').doUpdateSet({
          title: record.title,
          year: record.year,
          genre: record.genre,
          director: record.director,
          actors: record.actors,
          imdb_rating: record.imdb_rating,
          runtime: record.runtime,
          data: record.data,
          updated_at: sql`now()`,
        }),
      )
      .execute()
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

      const omdbResult = await this.getMovie({ id: omdbMovieId })
      const parsedOmdbMovie = omdbMovieSchema.safeParse(omdbResult)

      if (!parsedOmdbMovie.success) {
        throw new BadRequestException('Unable to load OMDb data for the uploaded movie.')
      }

      const omdbMovie = parsedOmdbMovie.data
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

  private static parseNumericQueryParam(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null
    }

    const parsed = Number.parseInt(String(value), 10)

    if (Number.isNaN(parsed)) {
      return null
    }

    return parsed
  }

  private static parseFloatQueryParam(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null
    }

    const parsed = Number.parseFloat(String(value))

    if (Number.isNaN(parsed)) {
      return null
    }

    return parsed
  }

  private static parseBooleanQueryParam(value: unknown) {
    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') {
      return true
    }

    if (normalized === 'false') {
      return false
    }

    return null
  }

  private static resolveLocalMoviesPagination(query: GetLocalMoviesDto = {}) {
    const rawPage = MoviesService.parseNumericQueryParam(query.page)
    const rawLimit = MoviesService.parseNumericQueryParam(query.limit)

    const page = rawPage && rawPage > 0 ? rawPage : 1
    const limit = rawLimit && rawLimit > 0 ? Math.min(rawLimit, 50) : 10

    return { page, limit }
  }

  private static normalizeTextQueryParam(value?: string | null) {
    if (value === undefined || value === null) {
      return null
    }

    const text = value.trim()
    return text.length > 0 ? text : null
  }

  private static buildSearchPattern(rawTerm?: string | null) {
    if (!rawTerm) {
      return null
    }

    const escaped = rawTerm.replace(/[%_]/g, '\\$&')
    return `%${escaped}%`
  }

  async getLocalMovies(query: GetLocalMoviesDto = {}) {
    const { page, limit } = MoviesService.resolveLocalMoviesPagination(query)
    const searchTerm = MoviesService.normalizeTextQueryParam(query.query)
    const searchPattern = MoviesService.buildSearchPattern(searchTerm)
    const genreFilter = MoviesService.normalizeTextQueryParam(query.genre)
    const yearFilter = MoviesService.parseNumericQueryParam(query.year)
    const minRatingFilter = MoviesService.parseFloatQueryParam(query.rating)
    const availabilityFilter = MoviesService.parseBooleanQueryParam(query.available)
    const offset = (page - 1) * limit

    if (availabilityFilter === false) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
        },
      }
    }

    let moviesQuery = this.db
      .selectFrom('local_movies as lm')
      .leftJoin('movie_metadata as mm', 'mm.omdb_id', 'lm.omdb_id')
      .selectAll('lm')
      .select(['mm.data as cached_metadata'])

    let totalQuery = this.db
      .selectFrom('local_movies as lm')
      .leftJoin('movie_metadata as mm', 'mm.omdb_id', 'lm.omdb_id')

    if (searchPattern) {
      moviesQuery = moviesQuery.where((eb) =>
        eb.or([
          eb('lm.title', 'ilike', searchPattern),
          eb('mm.title', 'ilike', searchPattern),
          eb('mm.genre', 'ilike', searchPattern),
          eb('mm.director', 'ilike', searchPattern),
          eb('mm.actors', 'ilike', searchPattern),
        ]),
      )

      totalQuery = totalQuery.where((eb) =>
        eb.or([
          eb('lm.title', 'ilike', searchPattern),
          eb('mm.title', 'ilike', searchPattern),
          eb('mm.genre', 'ilike', searchPattern),
          eb('mm.director', 'ilike', searchPattern),
          eb('mm.actors', 'ilike', searchPattern),
        ]),
      )
    }

    if (genreFilter) {
      const genrePattern = MoviesService.buildSearchPattern(genreFilter)
      moviesQuery = moviesQuery.where('mm.genre', 'ilike', genrePattern)
      totalQuery = totalQuery.where('mm.genre', 'ilike', genrePattern)
    }

    if (yearFilter !== null) {
      moviesQuery = moviesQuery.where('mm.year', '=', yearFilter)
      totalQuery = totalQuery.where('mm.year', '=', yearFilter)
    }

    if (minRatingFilter !== null) {
      moviesQuery = moviesQuery.where('mm.imdb_rating', '>=', minRatingFilter)
      totalQuery = totalQuery.where('mm.imdb_rating', '>=', minRatingFilter)
    }

    moviesQuery = moviesQuery.orderBy('lm.title', 'asc').offset(offset).limit(limit)

    const [moviesWithMetadata, totalResult] = await Promise.all([
      moviesQuery.execute(),
      totalQuery
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .executeTakeFirst(),
    ])

    const rawTotal = totalResult?.count ?? 0
    const total =
      typeof rawTotal === 'number'
        ? rawTotal
        : Number.parseInt(String(rawTotal), 10) || 0

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0
    const hasNextPage = page < totalPages

    const enrichedMovies: Array<LocalMovie & { metadata: unknown | null }> = []

    for (const movie of moviesWithMetadata) {
      const { cached_metadata, ...localMovie } = movie
      let metadata: unknown | null = cached_metadata ?? null

      if (!metadata && localMovie.omdb_id) {
        metadata = await this.getMovie({ id: localMovie.omdb_id })
      }

      enrichedMovies.push({ ...localMovie, metadata })
    }

    return {
      data: enrichedMovies,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
      },
    }
  }

  async getMovieStats(omdbMovieId: string) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.statObject(this.bucket, movieFileKey)
  }

  private async convertToFastStart(sourcePath: string): Promise<string> {
    throw new NotImplementedException(`This method needs to be imported by the FfmpegService.`)
  }
}
