import { Module } from '@nestjs/common';
import { MoviesModule } from './movies/movies.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MovieRequestsModule } from './movie-requests/movie-requests.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MinioModule } from './minio/minio.module';
import { FfmpegModule } from './ffmpeg/ffmpeg.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MoviesModule,
    DatabaseModule,
    MovieRequestsModule,
    UsersModule,
    AuthModule,
    MinioModule,
    FfmpegModule,
  ],
})
export class AppModule {}
