import { Controller, Get, Headers, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto, OmdbMovie } from './types'
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import type { Response } from 'express';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) { }

  private static readonly DEFAULT_CHUNK_SIZE = 1_000_000; // ~1MB chunks for initial playback

  @Get('local')
  async localMovies() {
    return await this.moviesService.getLocalMovies()
  }

  @Get()
  async getMovies(@Query() query: GetMoviesDto) {
    return await this.moviesService.getMovies(query)
  }

  @Get('movie')
  async getMovie(@Query() param: GetMovieDto) {
    return this.moviesService.getMovie(param)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMovie(@UploadedFile(new FileValidationPipe()) file: Express.Multer.File, @Query('omdb_id') omdbMovieId: string) {
    return await this.moviesService.uploadMovie(file, omdbMovieId)
  }

  @Get('stream')
  async streamMovie(@Query('omdb_id') omdbMovieId: string, @Headers('range') rangeHeader: string | undefined, @Res() res: Response) {
    const movieStats = await this.moviesService.getMovieStats(omdbMovieId)
    const fileSize = movieStats.size
    const contentType = movieStats.metaData?.['content-type'] ?? 'application/octet-stream'

    if (!rangeHeader) {
      res.status(200)
      res.set({ 'Content-Type': contentType, 'Content-Length': fileSize, 'Accept-Ranges': 'bytes' })
      res.flushHeaders?.()
      const movieStream = await this.moviesService.streamMovie(omdbMovieId)
      movieStream.on('error', (error) => res.destroy(error))
      movieStream.pipe(res)
      return
    }

    const rangeMatch = rangeHeader.match(/bytes=([^,]+)/i)
    if (!rangeMatch) {
      res.status(416)
      res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
      res.end()
      return
    }

    const [rawStart, rawEnd] = rangeMatch[1].split('-')

    let start = rawStart ? Number.parseInt(rawStart, 10) : undefined
    let end = rawEnd ? Number.parseInt(rawEnd, 10) : undefined

    if ((start !== undefined && Number.isNaN(start)) || (end !== undefined && Number.isNaN(end))) {
      res.status(416)
      res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
      res.end()
      return
    }

    if (start === undefined && end === undefined) {
      res.status(416)
      res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
      res.end()
      return
    }

    if (start === undefined) {
      const suffixLength = end ?? 0
      if (suffixLength <= 0) {
        res.status(416)
        res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
        res.end()
        return
      }

      start = Math.max(fileSize - suffixLength, 0)
      end = fileSize - 1
    } else {
      if (start >= fileSize) {
        res.status(416)
        res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
        res.end()
        return
      }

      if (end === undefined) {
        end = Math.min(start + MoviesController.DEFAULT_CHUNK_SIZE - 1, fileSize - 1)
      } else if (end >= fileSize) {
        end = fileSize - 1
      }

      if (start > end) {
        res.status(416)
        res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
        res.end()
        return
      }
    }

    const chunkSize = end - start + 1
    if (chunkSize <= 0) {
      res.status(416)
      res.set({ 'Content-Range': `bytes */${fileSize}`, 'Accept-Ranges': 'bytes' })
      res.end()
      return
    }
    const movieStream = await this.moviesService.streamMovieRange(omdbMovieId, start, chunkSize)

    res.status(206)
    res.set({
      'Content-Type': contentType,
      'Content-Length': chunkSize,
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
    })
    res.flushHeaders?.()

    movieStream.on('error', (error) => res.destroy(error))
    movieStream.pipe(res)
  }
}
