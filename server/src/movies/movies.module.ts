import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { MinioModule } from 'src/minio/minio.module';
import { DatabaseModule } from 'src/database/database.module';
import { FfmpegModule } from 'src/ffmpeg/ffmpeg.module';
import { OmdbApiModule } from 'src/omdb-api/omdb-api.module';
import { MetadataModule } from 'src/metadata/metadata.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { MovieRequestsModule } from 'src/movie-requests/movie-requests.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    HttpModule,
    OmdbApiModule,
    MetadataModule,
    FfmpegModule,
    AuthModule,
    UsersModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) =>
          cb(null, Date.now() + '-' + file.originalname),
      }),
      limits: {
        fileSize: 20 * 1024 * 1024 * 1024, // 20 GB
        files: 1,
      },
    }),
    MinioModule,
    DatabaseModule,
    MovieRequestsModule,
    NotificationsModule,
  ],
  providers: [MoviesService],
  controllers: [MoviesController],
})
export class MoviesModule { }
