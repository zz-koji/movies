import { BadRequestException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'
import { GetMovieDto, GetLocalMoviesDto, omdbMovieSchema, GetMoviesDto, LocalMovie, OmdbMovie } from './types'
import { GetCatalogDto } from './types/dto/get-catalog.dto';
import { Client as MinioClient } from 'minio'
import { Database } from 'src/database/types';
import { Kysely, sql } from 'kysely';
import { unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { extname } from 'path';
import type { Readable } from 'stream';
import { FfmpegService } from 'src/ffmpeg/ffmpeg.service';
import { OmdbApiService } from 'src/omdb-api/omdb-api.service';
import { MetadataService } from 'src/metadata/metadata.service';
import { MovieRequestsService } from 'src/movie-requests/movie-requests.service';
import { NotificationsService } from 'src/notifications/notifications.service';

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
  private static readonly DEFAULT_STREAM_CHUNK_SIZE = 1_048_576 // 1MB
  private static readonly MIN_STREAM_CHUNK_SIZE = 262_144
  private static readonly MAX_STREAM_CHUNK_SIZE = 8_388_608
  private bucket: string = 'movies'
  private readonly streamChunkSize: number
  constructor(
    @Inject('MINIO_CLIENT') private readonly minioClient: MinioClient,
    @Inject('MOVIES_DATABASE') private readonly db: Kysely<Database>,
    private readonly ffmpegService: FfmpegService,
    private readonly omdbService: OmdbApiService,
    private readonly metadataService: MetadataService,
    private readonly configService: ConfigService,
    private readonly movieRequestsService: MovieRequestsService,
    private readonly notificationsService: NotificationsService) {
    this.streamChunkSize = MoviesService.resolveStreamChunkSize(
      this.configService.get('STREAM_CHUNK_SIZE')
    )
  }

  async getMovies(param: GetMoviesDto) {
    const movies = await this.omdbService.getMovies({ title: param.title, page: param.page })
    return movies
  }

  async getMovie(param: GetMovieDto): Promise<OmdbMovie> {
    if (param.id) {
      const cached = await this.metadataService.getMovieMetadataRow(param.id)
      if (cached?.data) {
        return cached.data as OmdbMovie
      }
    }

    const movie = await this.omdbService.getOmdbMovie(param)

    if (this.omdbService.isSuccessfulOmdbRequest(movie)) {
      await this.metadataService.upsertMovieMetadata(movie)
    }
    const parsedOmdbMovie = omdbMovieSchema.safeParse(movie)

    if (!parsedOmdbMovie.success) {
      throw new BadRequestException('Unable to load OMDb data for the uploaded movie.')
    }


    return parsedOmdbMovie.data
  }

  private static sortMovie(movies: (LocalMovie & { metadata: OmdbMovie | null })[], sortBy: 'title' | 'year' | 'rating' = 'title') {
    if (sortBy === 'rating') {
      return movies.sort((a, b) => {
        if (!a?.metadata?.imdbRating || !b?.metadata?.imdbRating) return 0
        if (a?.metadata.imdbRating > b?.metadata.imdbRating) return 1;
        if (a?.metadata.imdbRating < b?.metadata.imdbRating) return -1;
        return 0
      })
    }

    if (sortBy === 'title') {
      return movies.sort((a, b) => {
        if (!a?.metadata?.Title || !b?.metadata?.Title) return 0;
        const aTitle = a.metadata.Title.toLowerCase()
        const bTitle = b?.metadata.Title.toLowerCase()

        if (aTitle > bTitle) return 1;
        if (aTitle < bTitle) return -1;

        return 0
      })
    }

    if (sortBy === 'year') {
      return movies.sort((a, b) => {
        if (!a?.metadata?.Year || !b?.metadata?.Year) return 0;
        if (a.metadata.Year > b.metadata.Year) return 1;
        if (a.metadata.Year < b.metadata.Year) return -1;
        return 0;
      })
    }

    return movies;

  }

  private async convertMovieToFastStart(filePath: string) {
    try {
      const fastStartPath = await this.ffmpegService.convertToFastStart(filePath);
      return fastStartPath
    } catch (error) {
      try {
        await unlink(filePath)
      } catch (error) {
        console.error(`Error while unlinking file: \n ${error}`)
      }
      throw new BadRequestException(`Unable to prepare video for streaming: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async uploadToMinio(
    filePath: string, fileName: string, mimetype: string
  ) {

    const fileStream = createReadStream(filePath);
    const result = await this.minioClient.putObject(
      this.bucket,
      fileName,
      fileStream,
      undefined,
      { 'Content-Type': mimetype },
    );

    return result
  }

  async uploadMovie(
    movie: Express.Multer.File,
    omdbMovieId: string,
    subtitleFile?: Express.Multer.File,
  ) {
    let uploadCompleted = false;
    let fileName: string | undefined;
    let subtitleFileName: string | undefined;
    let subtitlePath: string | null = null;

    try {
      const fastStartPath = await this.convertMovieToFastStart(movie.path);

      // Derive filename and mimetype from the processed output
      const outputExt = extname(fastStartPath);
      const originalName = movie.originalname.toLowerCase();
      const nameWithoutExt = originalName.replace(/\.[^.]+$/, '');
      fileName = `${nameWithoutExt}${outputExt}`;
      const mimetype = outputExt === '.mp4' ? 'video/mp4' : movie.mimetype;

      // Process subtitle (upload or extract)
      subtitlePath = await this.processSubtitle(
        fastStartPath,
        subtitleFile,
        nameWithoutExt,
      );

      const processedMovieFile = await this.uploadToMinio(
        fastStartPath,
        fileName,
        mimetype,
      );
      uploadCompleted = true;

      // Upload subtitle if available
      if (subtitlePath) {
        subtitleFileName = `${nameWithoutExt}.srt`;
        await this.uploadToMinio(subtitlePath, subtitleFileName, 'text/plain; charset=utf-8');
      }

      const omdbMovie = await this.getMovie({ id: omdbMovieId });

      const recordUpload = await this.insertMovieRecord({
        description: omdbMovie.Plot,
        movie_file_key: fileName,
        subtitle_file_key: subtitleFileName,
        title: omdbMovie.Title,
        omdb_id: omdbMovie.imdbID,
      });

      if (recordUpload) {
        void this.runAutoMatch(
          recordUpload.id,
          omdbMovie.imdbID,
          omdbMovie.Title,
        );
      }

      return { upload: processedMovieFile, movie: recordUpload };
    } catch (error) {
      if (uploadCompleted && fileName) {
        await this.minioClient.removeObject(this.bucket, fileName);
      }
      if (subtitleFileName) {
        await this.minioClient
          .removeObject(this.bucket, subtitleFileName)
          .catch(() => undefined);
      }
      throw new BadRequestException(
        `Upload failed: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      try {
        await unlink(movie.path);
      } catch (error) {
        console.error(`Error unlinking movie: ${error}`);
      }
      if (subtitleFile?.path) {
        try {
          await unlink(subtitleFile.path);
        } catch (error) {
          console.error(`Error unlinking subtitle: ${error}`);
        }
      }
      // Clean up extracted subtitle file if it exists and is different from uploaded subtitle
      if (subtitlePath && subtitlePath !== subtitleFile?.path) {
        try {
          await unlink(subtitlePath);
        } catch (error) {
          console.error(`Error unlinking extracted subtitle: ${error}`);
        }
      }
    }
  }

  private async runAutoMatch(
    movieId: string,
    omdbId: string,
    title: string,
  ): Promise<void> {
    try {
      const { requestIds } =
        await this.movieRequestsService.autoMatchAndFulfill(
          movieId,
          omdbId,
          title,
        );

      for (const requestId of requestIds) {
        const request =
          await this.movieRequestsService.getByIdWithUser(requestId);
        if (request) {
          await this.notificationsService.notifyRequestFulfilled(
            request.requested_by,
            request.title ?? title,
            title,
            requestId,
          );
        }
      }
    } catch (error) {
      console.error('Auto-match after upload failed:', error);
    }
  }

  private async processSubtitle(
    videoPath: string,
    uploadedSubtitle: Express.Multer.File | undefined,
    baseFileName: string,
  ): Promise<string | null> {
    try {
      // If subtitle file was uploaded, use it
      if (uploadedSubtitle) {
        console.log('Using uploaded subtitle file');
        return uploadedSubtitle.path;
      }

      // Try to extract subtitle from video
      console.log('Attempting to extract subtitle from video');
      const streams = await this.ffmpegService.probeSubtitleStreams(videoPath);

      if (streams.length === 0) {
        console.log('No subtitle streams found in video');
        return null;
      }

      // Prefer English subtitles, otherwise use first available
      let selectedStream = streams.find(
        (s) => s.language?.toLowerCase() === 'eng' || s.language?.toLowerCase() === 'en',
      );

      if (!selectedStream) {
        selectedStream = streams[0];
      }

      console.log(
        `Extracting subtitle stream ${selectedStream.index} (${selectedStream.codecName}, ${selectedStream.language || 'unknown'})`,
      );

      const outputPath = `${videoPath}.extracted.srt`;
      await this.ffmpegService.extractSubtitleToSrt(
        videoPath,
        selectedStream.index,
        outputPath,
      );

      return outputPath;
    } catch (error) {
      console.error(
        'Subtitle processing failed (non-blocking):',
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  async uploadSubtitleToMovie(
    omdbId: string,
    subtitleFile: Express.Multer.File,
  ): Promise<LocalMovie> {
    try {
      // Get movie record
      const movie = await this.db
        .selectFrom('local_movies')
        .where('omdb_id', '=', omdbId)
        .selectAll()
        .executeTakeFirstOrThrow(
          () => new NotFoundException('Movie not found'),
        );

      // Generate subtitle filename based on video filename
      const videoBaseName = movie.movie_file_key.replace(/\.[^.]+$/, '');
      const subtitleFileName = `${videoBaseName}.srt`;

      // Upload to MinIO
      await this.uploadToMinio(
        subtitleFile.path,
        subtitleFileName,
        'text/plain; charset=utf-8',
      );

      // Delete old subtitle if exists
      if (movie.subtitle_file_key) {
        await this.minioClient
          .removeObject(this.bucket, movie.subtitle_file_key)
          .catch(() => undefined);
      }

      // Update database
      const updatedMovie = await this.db
        .updateTable('local_movies')
        .set({ subtitle_file_key: subtitleFileName })
        .where('omdb_id', '=', omdbId)
        .returningAll()
        .executeTakeFirstOrThrow();

      return updatedMovie;
    } finally {
      try {
        await unlink(subtitleFile.path);
      } catch (error) {
        console.error(`Error unlinking subtitle file: ${error}`);
      }
    }
  }

  async streamSubtitle(omdbId: string): Promise<Readable> {
    const movie = await this.db
      .selectFrom('local_movies')
      .where('omdb_id', '=', omdbId)
      .select('subtitle_file_key')
      .executeTakeFirstOrThrow(
        () => new NotFoundException('Movie not found'),
      );

    if (!movie.subtitle_file_key) {
      throw new NotFoundException('No subtitle available for this movie');
    }

    return await this.minioClient.getObject(
      this.bucket,
      movie.subtitle_file_key,
    );
  }

  private async insertMovieRecord(
    data: Pick<
      LocalMovie,
      'description' | 'movie_file_key' | 'title' | 'omdb_id' | 'subtitle_file_key'
    >,
  ) {
    const recordUpload = await this.db
      .insertInto('local_movies')
      .values(data)
      .returningAll()
      .executeTakeFirst();

    return recordUpload;
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

    const range = MoviesService.parseRangeHeader(rangeHeader, fileSize, this.streamChunkSize)

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

  private static parseRangeHeader(rangeHeader: string, fileSize: number, chunkSize: number): RangeBounds | null {
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
      const computedEnd = start + chunkSize - 1
      return { start, end: Math.min(computedEnd, Math.max(fileSize - 1, 0)) }
    }

    end = Math.min(end, Math.max(fileSize - 1, 0))

    if (start > end) {
      return null
    }

    return { start, end }
  }

  private static resolveStreamChunkSize(rawSize: unknown): number {
    const fallback = MoviesService.DEFAULT_STREAM_CHUNK_SIZE

    if (rawSize === null || rawSize === undefined || rawSize === '') {
      return fallback
    }

    const parsed = typeof rawSize === 'number'
      ? rawSize
      : Number.parseInt(String(rawSize), 10)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback
    }

    const bounded = Math.min(
      MoviesService.MAX_STREAM_CHUNK_SIZE,
      Math.max(parsed, MoviesService.MIN_STREAM_CHUNK_SIZE)
    )

    return bounded
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

  private static resolveQuery(query: GetLocalMoviesDto) {
    const { page, limit } = MoviesService.resolveLocalMoviesPagination(query)
    const searchTerm = MoviesService.normalizeTextQueryParam(query.query)
    const searchPattern = MoviesService.buildSearchPattern(searchTerm)
    const genreFilter = MoviesService.normalizeTextQueryParam(query.genre)
    const yearFilter = MoviesService.parseNumericQueryParam(query.year)
    const minRatingFilter = MoviesService.parseFloatQueryParam(query.rating)
    const availabilityFilter = MoviesService.parseBooleanQueryParam(query.available)
    const offset = (page - 1) * limit

    const sortBy: 'title' | 'year' | 'rating' =
      query.sortBy === 'rating' || query.sortBy === 'year' ? query.sortBy : 'title'

    return {
      pagination: { page, limit },
      searchPattern,
      genreFilter,
      yearFilter,
      minRatingFilter,
      availabilityFilter,
      offset,
      sortBy,

    }
  }

  private buildLocalMoviesQuery(query: GetLocalMoviesDto = {}) {
    const { genreFilter, minRatingFilter, offset, pagination: { limit }, searchPattern, yearFilter, sortBy } = MoviesService.resolveQuery(query)
    let moviesQuery = this.db
      .selectFrom('local_movies as lm')
      .leftJoin('movie_metadata as mm', 'mm.omdb_id', 'lm.omdb_id')
      .selectAll('lm')
      .select(['mm.data as cached_metadata'])

    let totalQuery = this.db
      .selectFrom('local_movies as lm')
      .leftJoin('movie_metadata as mm', 'mm.omdb_id', 'lm.omdb_id')

    let comingSoonQuery = this.db
      .selectFrom('movie_requests as mr')
      .leftJoin('movie_metadata as mm', 'mr.omdb_id', 'mm.omdb_id')

    let subTotalQuery = totalQuery


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

      subTotalQuery = totalQuery.where((eb) =>
        eb.or([
          eb('lm.title', 'ilike', searchPattern),
          eb('mm.title', 'ilike', searchPattern),
          eb('mm.genre', 'ilike', searchPattern),
          eb('mm.director', 'ilike', searchPattern),
          eb('mm.actors', 'ilike', searchPattern),
        ]),
      )
      comingSoonQuery = comingSoonQuery.where((eb) =>
        eb.or([
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
      subTotalQuery = subTotalQuery.where('mm.genre', 'ilike', genrePattern)
      comingSoonQuery = comingSoonQuery.where('mm.genre', 'ilike', genrePattern)
    }

    if (yearFilter !== null) {
      moviesQuery = moviesQuery.where('mm.year', '=', yearFilter)
      subTotalQuery = subTotalQuery.where('mm.year', '=', yearFilter)
      comingSoonQuery = comingSoonQuery.where('mm.year', 'ilike', yearFilter)
    }

    if (minRatingFilter !== null) {
      moviesQuery = moviesQuery.where('mm.imdb_rating', '>=', minRatingFilter)
      subTotalQuery = subTotalQuery.where('mm.imdb_rating', '>=', minRatingFilter)
      comingSoonQuery = comingSoonQuery.where('mm.imdb_rating', '>=', minRatingFilter)
    }

    if (sortBy === 'rating') {
      moviesQuery = moviesQuery
        .orderBy('mm.imdb_rating', 'desc')
        .orderBy('mm.title', 'asc')
        .orderBy('lm.title', 'asc')
    } else if (sortBy === 'year') {
      moviesQuery = moviesQuery
        .orderBy('mm.year', 'desc')
        .orderBy('mm.title', 'asc')
        .orderBy('lm.title', 'asc')
    } else {
      moviesQuery = moviesQuery
        .orderBy('mm.title', 'asc')
        .orderBy('lm.title', 'asc')
    }

    moviesQuery = moviesQuery.offset(offset).limit(limit)

    return { moviesQuery, totalQuery, subTotalQuery, comingSoonQuery }
  }

  private buildUnfulfilledRequestsQuery(query: GetLocalMoviesDto = {}) {
    const { genreFilter, minRatingFilter, offset, pagination: { limit }, searchPattern, yearFilter, sortBy } = MoviesService.resolveQuery(query)

    let requestsQuery = this.db
      .selectFrom('movie_requests as mr')
      .leftJoin('movie_metadata as mm', 'mr.omdb_id', 'mm.omdb_id')
      .where('mr.fulfilled_movie_id', 'is', null)
      .select([
        'mr.id',
        'mr.omdb_id',
        'mr.title',
        sql<string | null>`NULL`.as('movie_file_key'),
        sql<string | null>`NULL`.as('subtitle_file_key'),
        sql<string>`''`.as('description'),
        'mm.data as cached_metadata',
      ])

    let countQuery = this.db
      .selectFrom('movie_requests as mr')
      .leftJoin('movie_metadata as mm', 'mr.omdb_id', 'mm.omdb_id')
      .where('mr.fulfilled_movie_id', 'is', null)


    if (searchPattern) {
      requestsQuery = requestsQuery.where((eb) =>
        eb.or([
          eb('mr.title', 'ilike', searchPattern),
          eb('mm.title', 'ilike', searchPattern),
          eb('mm.genre', 'ilike', searchPattern),
          eb('mm.director', 'ilike', searchPattern),
          eb('mm.actors', 'ilike', searchPattern),
        ]),
      )

      countQuery = countQuery.where((eb) =>
        eb.or([
          eb('mr.title', 'ilike', searchPattern),
          eb('mm.title', 'ilike', searchPattern),
          eb('mm.genre', 'ilike', searchPattern),
          eb('mm.director', 'ilike', searchPattern),
          eb('mm.actors', 'ilike', searchPattern),
        ]),
      )
    }

    if (genreFilter) {
      const genrePattern = MoviesService.buildSearchPattern(genreFilter)
      requestsQuery = requestsQuery.where('mm.genre', 'ilike', genrePattern)
      countQuery = countQuery.where('mm.genre', 'ilike', genrePattern)
    }

    if (yearFilter !== null) {
      requestsQuery = requestsQuery.where('mm.year', '=', yearFilter)
      countQuery = countQuery.where('mm.year', '=', yearFilter)
    }

    if (minRatingFilter !== null) {
      requestsQuery = requestsQuery.where('mm.imdb_rating', '>=', minRatingFilter)
      countQuery = countQuery.where('mm.imdb_rating', '>=', minRatingFilter)
    }

    if (sortBy === 'rating') {
      requestsQuery = requestsQuery
        .orderBy('mm.imdb_rating', 'desc')
        .orderBy('mm.title', 'asc')
        .orderBy('mr.title', 'asc')
    } else if (sortBy === 'year') {
      requestsQuery = requestsQuery
        .orderBy('mm.year', 'desc')
        .orderBy('mm.title', 'asc')
        .orderBy('mr.title', 'asc')
    } else {
      requestsQuery = requestsQuery
        .orderBy('mm.title', 'asc')
        .orderBy('mr.title', 'asc')
    }

    requestsQuery = requestsQuery.offset(offset).limit(limit)

    return { requestsQuery, countQuery }
  }

  async getLocalMovies(query: GetLocalMoviesDto = {}) {
    const { availabilityFilter } = MoviesService.resolveQuery(query)

    // Handle different availability filters
    if (availabilityFilter === false) {
      // Return only unfulfilled requests (Coming Soon)
      return this.getUnfulfilledRequests(query)
    } else if (availabilityFilter === true) {
      // Return only available movies (current behavior)
      return this.getAvailableMovies(query)
    } else {
      // Return both available movies and unfulfilled requests (All)
      return this.getAllMoviesAndRequests(query)
    }
  }

  private async getAvailableMovies(query: GetLocalMoviesDto = {}) {
    const { moviesQuery, totalQuery, subTotalQuery, comingSoonQuery } = this.buildLocalMoviesQuery(query)

    const [moviesWithMetadata, totalResult, subTotalResult, comingSoonResult] = await Promise.all([
      moviesQuery.execute(),
      totalQuery
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .select(({ fn }) => fn.sum<number>('mm.runtime').as('runtime'))
        .executeTakeFirst(),
      subTotalQuery
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .executeTakeFirst(),
      comingSoonQuery
        .select(({ fn }) => fn.count<number>('id').as('count')).where('fulfilled_movie_id', 'is', null)
        .executeTakeFirst()
    ])

    const total = totalResult?.count ? Number(totalResult.count) : 0
    const subTotal = subTotalResult?.count ? Number(subTotalResult.count) : 0
    const comingSoon = comingSoonResult?.count ? Number(comingSoonResult.count) : 0
    const totalRuntime = totalResult?.runtime ? Number(totalResult.runtime) : 0

    const limit = query?.limit ? Number(query.limit) : 0
    const page = query?.page ? Number(query.page) : 0

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0
    const hasNextPage = page < totalPages

    const enrichedMovies: Array<LocalMovie & { metadata: OmdbMovie | null }> = []

    for (const movie of moviesWithMetadata) {
      const { cached_metadata, ...localMovie } = movie
      let metadata: OmdbMovie | null = cached_metadata

      if (!metadata && localMovie.omdb_id) {
        metadata = await this.getMovie({ id: localMovie.omdb_id })
      }

      enrichedMovies.push({ ...localMovie, metadata })
    }

    return {
      data: MoviesService.sortMovie(enrichedMovies, query.sortBy),
      pagination: {
        subTotal,
        comingSoon,
        page,
        limit,
        total,
        totalRuntime,
        totalPages,
        hasNextPage,
      },
    }
  }

  private async getUnfulfilledRequests(query: GetLocalMoviesDto = {}) {
    const { requestsQuery, countQuery } = this.buildUnfulfilledRequestsQuery(query)

    const [requestsWithMetadata, countResult] = await Promise.all([
      requestsQuery.execute(),
      countQuery
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .executeTakeFirst(),
    ])

    const total = countResult?.count ? Number(countResult.count) : 0
    const limit = query?.limit ? Number(query.limit) : 0
    const page = query?.page ? Number(query.page) : 0

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0
    const hasNextPage = page < totalPages

    const enrichedMovies: Array<LocalMovie & { available: boolean; metadata: OmdbMovie | null }> = []

    for (const request of requestsWithMetadata) {
      const { cached_metadata, ...movieData } = request
      let metadata: OmdbMovie | null = cached_metadata

      if (!metadata && movieData.omdb_id) {
        metadata = await this.getMovie({ id: movieData.omdb_id })
      }

      enrichedMovies.push({
        id: movieData.id,
        omdb_id: movieData.omdb_id || '',
        title: movieData.title || '',
        description: movieData.description || '',
        movie_file_key: movieData.movie_file_key as any,
        subtitle_file_key: movieData.subtitle_file_key as any,
        available: false,
        metadata,
      })
    }

    // Get overall stats for pagination
    const [totalAvailable, totalRequests] = await Promise.all([
      this.db
        .selectFrom('local_movies')
        .leftJoin('movie_metadata as mm', 'mm.omdb_id', 'local_movies.omdb_id')
        .select(({ fn }) => fn.count<number>('local_movies.id').as('count'))
        .select(({ fn }) => fn.sum<number>('mm.runtime').as('runtime'))
        .executeTakeFirst(),
      this.db
        .selectFrom('movie_requests')
        .where('fulfilled_movie_id', 'is', null)
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .executeTakeFirst(),
    ])

    return {
      data: MoviesService.sortMovie(enrichedMovies, query.sortBy),
      pagination: {
        subTotal: total,
        comingSoon: total,
        page,
        limit,
        total,
        totalRuntime: totalAvailable?.runtime ? Number(totalAvailable.runtime) : 0,
        totalPages,
        hasNextPage,
      },
    }
  }

  private async getAllMoviesAndRequests(query: GetLocalMoviesDto = {}) {
    const { pagination: { limit, page }, offset } = MoviesService.resolveQuery(query)

    // Get both available movies and unfulfilled requests
    const { moviesQuery: availableQuery, totalQuery, comingSoonQuery } = this.buildLocalMoviesQuery(query)
    const { requestsQuery: requestsQuery } = this.buildUnfulfilledRequestsQuery(query)

    // Remove limit/offset from individual queries - we'll apply it after merging
    const availableQueryNoLimit = availableQuery.clearLimit().clearOffset()
    const requestsQueryNoLimit = requestsQuery.clearLimit().clearOffset()

    const [availableMovies, unfulfilledRequests, totalResult, comingSoonResult] = await Promise.all([
      availableQueryNoLimit.execute(),
      requestsQueryNoLimit.execute(),
      totalQuery
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .select(({ fn }) => fn.sum<number>('mm.runtime').as('runtime'))
        .executeTakeFirst(),
      comingSoonQuery
        .select(({ fn }) => fn.count<number>('id').as('count'))
        .where('fulfilled_movie_id', 'is', null)
        .executeTakeFirst(),
    ])

    // Merge and enrich all results
    const allMovies: Array<LocalMovie & { metadata: OmdbMovie | null }> = []

    for (const movie of availableMovies) {
      const { cached_metadata, ...localMovie } = movie
      let metadata: OmdbMovie | null = cached_metadata

      if (!metadata && localMovie.omdb_id) {
        metadata = await this.getMovie({ id: localMovie.omdb_id })
      }

      allMovies.push({ ...localMovie, metadata })
    }

    for (const request of unfulfilledRequests) {
      const { cached_metadata, ...movieData } = request
      let metadata: OmdbMovie | null = cached_metadata

      if (!metadata && movieData.omdb_id) {
        metadata = await this.getMovie({ id: movieData.omdb_id })
      }

      allMovies.push({
        id: movieData.id,
        omdb_id: movieData.omdb_id || '',
        title: movieData.title || '',
        description: movieData.description || '',
        movie_file_key: movieData.movie_file_key as any,
        subtitle_file_key: movieData.subtitle_file_key as any,
        metadata,
      })
    }

    // Sort all movies
    const sortedMovies = MoviesService.sortMovie(allMovies, query.sortBy)

    // Apply pagination
    const paginatedMovies = sortedMovies.slice(offset, offset + limit)

    const totalAvailable = totalResult?.count ? Number(totalResult.count) : 0
    const comingSoon = comingSoonResult?.count ? Number(comingSoonResult.count) : 0
    const total = totalAvailable + comingSoon
    const totalRuntime = totalResult?.runtime ? Number(totalResult.runtime) : 0

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0
    const hasNextPage = page < totalPages

    return {
      data: paginatedMovies,
      pagination: {
        subTotal: total,
        comingSoon,
        page,
        limit,
        total,
        totalRuntime,
        totalPages,
        hasNextPage,
      },
    }
  }

  async getMovieStats(omdbMovieId: string) {
    const movieFileKey = await this.getMovieFileKey(omdbMovieId)
    return await this.minioClient.statObject(this.bucket, movieFileKey)
  }

  async deleteMovie(imdbId: string) {
    const movieFileKey = await this.getMovieFileKey(imdbId)
    const [deleteRecord, _deleteObject] = await Promise.all([
      await this.db.deleteFrom('local_movies').where('omdb_id', '=', imdbId).returningAll().executeTakeFirst(),
      await this.minioClient.removeObject(this.bucket, movieFileKey)
    ])

    return deleteRecord
  }

  async getMovieCatalog(params: GetCatalogDto) {
    const page = params.page && params.page > 0 ? params.page : 1
    const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 50) : 10

    // If no query, return empty state
    if (!params.query || params.query.trim() === '') {
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

    // Search OMDB
    const omdbResults = await this.omdbService.getMovies({
      title: params.query,
      page,
    })

    // Enrich with availability status
    const enrichedMovies = await this.enrichWithAvailability(omdbResults.Search || [])

    const total = omdbResults.totalResults ? parseInt(omdbResults.totalResults, 10) : 0
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0
    const hasNextPage = page < totalPages

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

  private async enrichWithAvailability(omdbMovies: any[]) {
    if (omdbMovies.length === 0) {
      return []
    }

    const omdbIds = omdbMovies.map((m) => m.imdbID).filter(Boolean)

    // Batch query: check which movies are available
    const availableMovies = await this.db
      .selectFrom('local_movies')
      .where('omdb_id', 'in', omdbIds)
      .select('omdb_id')
      .execute()

    const availableSet = new Set(availableMovies.map((m) => m.omdb_id))

    // Batch query: check which movies are requested (unfulfilled)
    const requestedMovies = await this.db
      .selectFrom('movie_requests')
      .where('omdb_id', 'in', omdbIds)
      .where('fulfilled_movie_id', 'is', null)
      .select('omdb_id')
      .execute()

    const requestedSet = new Set(requestedMovies.map((m) => m.omdb_id))

    // Enrich each movie with status flags
    return omdbMovies.map((movie) => ({
      ...movie,
      available: availableSet.has(movie.imdbID),
      requested: requestedSet.has(movie.imdbID),
    }))
  }
}
