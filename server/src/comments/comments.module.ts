import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CommentsService } from './comments.service';
import { CommentsController, CommentDeleteController } from './comments.controller';

@Module({
  imports: [DatabaseModule, AuthModule, NotificationsModule],
  controllers: [CommentsController, CommentDeleteController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
