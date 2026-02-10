import { Module } from '@nestjs/common';
import { MoviesModule } from './movies/movies.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MovieRequestsModule } from './movie-requests/movie-requests.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MinioModule } from './minio/minio.module';
import { FfmpegModule } from './ffmpeg/ffmpeg.module';
import { OmdbApiModule } from './omdb-api/omdb-api.module';
import { MetadataModule } from './metadata/metadata.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentsModule } from './comments/comments.module';
import { StorageModule } from './storage/storage.module';

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
    OmdbApiModule,
    MetadataModule,
    AdminModule,
    AuditModule,
    NotificationsModule,
    CommentsModule,
    StorageModule,
  ],
})
export class AppModule {}
