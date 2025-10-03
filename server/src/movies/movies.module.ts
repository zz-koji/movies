import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MinioModule } from 'src/minio/minio.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [HttpModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
      }),
    })
    , MinioModule, DatabaseModule],
  providers: [MoviesService],
  controllers: [MoviesController]
})
export class MoviesModule { }
