import { Controller, Get, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto, OmdbMovie } from './types'
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { createReadStream } from 'fs';
import type { Response } from 'express';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) { }

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
  async streamMovie(@Query('omdb_id') omdbMovieId: string, @Res({ passthrough: true }) res: Response) {
    const movieStats = await this.moviesService.getMovieStats(omdbMovieId)
    res.set({ 'Content-Type': movieStats.metaData?.['content-type'], 'Accept-Ranges': 'bytes', 'Content-Length': movieStats.size })
    const movieStream = await this.moviesService.streamMovie(omdbMovieId)
    return new StreamableFile(movieStream)
  }
}
