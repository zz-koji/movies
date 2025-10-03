import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';

@Module({
  imports: [HttpModule, MulterModule.register({ storage: multer.memoryStorage() })],
  providers: [MoviesService],
  controllers: [MoviesController]
})
export class MoviesModule { }
