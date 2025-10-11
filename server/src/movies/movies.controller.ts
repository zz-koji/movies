import { Controller, Delete, Get, Headers, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto, GetLocalMoviesDto } from './types'
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import type { Response } from 'express';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) { }

  @Get('local')
  async localMovies(@Query() query: GetLocalMoviesDto) {
    return await this.moviesService.getLocalMovies(query)
  }

  @Get()
  async getMovies(@Query() query: GetMoviesDto) {
    return this.moviesService.getMovies(query)
  }

  @Get('omdb')
  async getOmdbMovies(@Query() query: GetMoviesDto) {
    return this.moviesService.getMovies(query)
  }

  @Get('movie')
  async getMovie(@Query() param: GetMovieDto) {
    return await this.moviesService.getMovie(param)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMovie(@UploadedFile(new FileValidationPipe()) file: Express.Multer.File, @Query('omdb_id') omdbMovieId: string) {
    return await this.moviesService.uploadMovie(file, omdbMovieId)
  }

  @Get('stream')
  async streamMovie(@Query('omdb_id') omdbMovieId: string, @Headers('range') rangeHeader: string | undefined, @Res() res: Response) {
    const { headers, status, stream } = await this.moviesService.createStreamResponse(omdbMovieId, rangeHeader)

    res.status(status)
    res.set(headers)

    if (!stream) {
      res.end()
      return
    }

    res.flushHeaders?.()
    stream.on('error', (error) => res.destroy(error))
    stream.pipe(res)
  }

  @Delete('local/:imdbId')
  async deleteMovie(@Param('imdbId') imdbId: string) {
    return await this.moviesService.deleteMovie(imdbId)
  }
}
