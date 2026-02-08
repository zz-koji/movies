import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { User } from 'src/users/types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() user: User) {
    return this.notificationsService.getByUser(user.id);
  }

  @Get('unread')
  async getUnreadNotifications(@CurrentUser() user: User) {
    return this.notificationsService.getUnread(user.id);
  }

  @Get('unread/count')
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: User,
  ) {
    await this.notificationsService.markAsRead(notificationId, user.id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: User) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }
}
