import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { User } from 'src/users/types';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CommentsService } from './comments.service';
import type { CreateCommentSchema } from './types';

@Controller('requests/:requestId/comments')
@UseGuards(AuthGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async getComments(@Param('requestId') requestId: string) {
    return this.commentsService.getByRequestId(requestId);
  }

  @Post()
  async addComment(
    @Param('requestId') requestId: string,
    @Body() data: CreateCommentSchema,
    @CurrentUser() user: User,
  ) {
    const comment = await this.commentsService.create(requestId, user.id, data);

    // Notify request owner if commenter is not the owner
    const requestOwner = await this.commentsService.getRequestOwner(requestId);
    if (requestOwner && requestOwner !== user.id) {
      // Get request title for notification
      await this.notificationsService.notifyNewComment(
        requestOwner,
        'Movie Request', // We'd need to fetch the actual title
        user.name,
        requestId,
      );
    }

    return comment;
  }
}

// Separate controller for deleting comments by ID
@Controller('comments')
@UseGuards(AuthGuard)
export class CommentDeleteController {
  constructor(private readonly commentsService: CommentsService) {}

  @Delete(':id')
  async deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: User,
  ) {
    const isAdmin = user.role === 'admin';
    await this.commentsService.delete(commentId, user.id, isAdmin);
    return { success: true };
  }
}
