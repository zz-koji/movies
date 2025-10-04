import { Controller, Get, Headers, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto } from './types'
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import type { Response } from 'express';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) { }

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
}
