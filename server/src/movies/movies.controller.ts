import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import type { GetMoviesDto, GetMovieDto, GetLocalMoviesDto } from './types';
import type { GetCatalogDto } from './types/dto/get-catalog.dto';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { FileValidationPipe } from 'src/file-validation/file-validation.pipe';
import { SubtitleValidationPipe } from 'src/file-validation/subtitle-validation.pipe';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { Transform } from 'stream';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('local')
  async localMovies(@Query() query: GetLocalMoviesDto) {
    return await this.moviesService.getLocalMovies(query);
  }

  @Get('catalog')
  async getCatalog(@Query() query: GetCatalogDto) {
    return await this.moviesService.getMovieCatalog(query);
  }

  @Get()
  async getMovies(@Query() query: GetMoviesDto) {
    return this.moviesService.getMovies(query);
  }

  @Get('omdb')
  async getOmdbMovies(@Query() query: GetMoviesDto) {
    return this.moviesService.getMovies(query);
  }

  @Get('movie')
  async getMovie(@Query() param: GetMovieDto) {
    return await this.moviesService.getMovie(param);
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'subtitle', maxCount: 1 },
    ]),
  )
  async uploadMovie(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      subtitle?: Express.Multer.File[];
    },
    @Query('omdb_id') omdbMovieId: string,
  ) {
    const videoFile = files.file?.[0];
    const subtitleFile = files.subtitle?.[0];

    if (!videoFile) {
      throw new Error('Video file is required');
    }

    // Validate files
    new FileValidationPipe().transform(videoFile, {} as any);
    if (subtitleFile) {
      new SubtitleValidationPipe().transform(subtitleFile, {} as any);
    }

    return await this.moviesService.uploadMovie(
      videoFile,
      omdbMovieId,
      subtitleFile,
    );
  }

  @Get('stream')
  async streamMovie(
    @Query('omdb_id') omdbMovieId: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ) {
    const { headers, status, stream } =
      await this.moviesService.createStreamResponse(omdbMovieId, rangeHeader);

    res.status(status);
    res.set(headers);

    if (!stream) {
      res.end();
      return;
    }

    res.flushHeaders?.();

    const onClose = () => {
      stream.off('error', onError);
      stream.off('end', onEnd);
      stream.destroy();
    };

    const onEnd = () => {
      res.off('close', onClose);
      stream.off('error', onError);
    };

    const onError = (error: unknown) => {
      res.off('close', onClose);
      stream.off('end', onEnd);
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      res.destroy(normalizedError);
    };

    res.once('close', onClose);
    stream.once('end', onEnd);
    stream.once('error', onError);

    stream.pipe(res);
  }

  @Get('subtitle')
  async streamSubtitle(@Query('omdb_id') omdbId: string, @Res() res: Response) {
    const stream = await this.moviesService.streamSubtitle(omdbId);

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Buffer the entire subtitle file for processing
    const chunks: Buffer[] = [];

    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      let content = Buffer.concat(chunks).toString('utf-8');

      // Strip BOM if present
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }

      // Convert SRT to WebVTT format
      const vttContent = this.convertSrtToVtt(content);

      res.send(vttContent);
    });

    stream.on('error', (error) => {
      console.error('Error streaming subtitle:', error);
      res.status(500).send('Error loading subtitle');
    });
  }

  private convertSrtToVtt(srt: string): string {
    // Normalize line endings to LF
    srt = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Add WebVTT header
    let vtt = 'WEBVTT\n\n';

    // Replace SRT timestamps (comma) with WebVTT timestamps (period)
    vtt += srt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

    return vtt;
  }

  @Post(':omdbId/subtitle')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('subtitle'))
  async uploadSubtitle(
    @Param('omdbId') omdbId: string,
    @UploadedFile(new SubtitleValidationPipe()) file: Express.Multer.File,
  ) {
    return await this.moviesService.uploadSubtitleToMovie(omdbId, file);
  }

  @Delete('local/:imdbId')
  @UseGuards(AuthGuard)
  async deleteMovie(@Param('imdbId') imdbId: string) {
    return await this.moviesService.deleteMovie(imdbId);
  }
}
