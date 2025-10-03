import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import multer from 'multer';
import { MinioModule } from 'src/minio/minio.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [HttpModule, MulterModule.register({ storage: multer.memoryStorage() }), MinioModule, DatabaseModule],
  providers: [MoviesService],
  controllers: [MoviesController]
})
export class MoviesModule { }
