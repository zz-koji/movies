import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { MovieRequestsModule } from 'src/movie-requests/movie-requests.module';
import { UsersModule } from 'src/users/users.module';
import { AuditModule } from 'src/audit/audit.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    MovieRequestsModule,
    UsersModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
