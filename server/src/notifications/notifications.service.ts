import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from 'src/database/types';
import { CreateNotificationSchema, Notification, NotificationType } from './types';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject('MOVIES_DATABASE')
    private readonly db: Kysely<Database>,
  ) {}

  async create(data: CreateNotificationSchema): Promise<Notification> {
    const result = await this.db
      .insertInto('notifications')
      .values({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        reference_type: data.reference_type ?? null,
        reference_id: data.reference_id ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      user_id: result.user_id,
      type: result.type as NotificationType,
      title: result.title,
      message: result.message,
      reference_type: result.reference_type,
      reference_id: result.reference_id,
      read_at: result.read_at,
      created_at: result.created_at,
    };
  }

  async createBulk(notifications: CreateNotificationSchema[]): Promise<void> {
    if (notifications.length === 0) return;

    await this.db
      .insertInto('notifications')
      .values(
        notifications.map((n) => ({
          user_id: n.user_id,
          type: n.type,
          title: n.title,
          message: n.message,
          reference_type: n.reference_type ?? null,
          reference_id: n.reference_id ?? null,
        })),
      )
      .execute();
  }

  private mapRow = (r: { id: string; user_id: string; type: string; title: string; message: string; reference_type: string | null; reference_id: string | null; read_at: Date | null; created_at: Date }): Notification => ({
    id: r.id,
    user_id: r.user_id,
    type: r.type as NotificationType,
    title: r.title,
    message: r.message,
    reference_type: r.reference_type,
    reference_id: r.reference_id,
    read_at: r.read_at,
    created_at: r.created_at,
  });

  async getByUser(userId: string): Promise<Notification[]> {
    const results = await this.db
      .selectFrom('notifications')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .limit(50)
      .execute();

    return results.map(this.mapRow);
  }

  async getUnread(userId: string): Promise<Notification[]> {
    const results = await this.db
      .selectFrom('notifications')
      .selectAll()
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .orderBy('created_at', 'desc')
      .execute();

    return results.map(this.mapRow);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.db
      .selectFrom('notifications')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .executeTakeFirst();

    return result ? parseInt(result.count, 10) : 0;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.db
      .updateTable('notifications')
      .set({ read_at: new Date() })
      .where('id', '=', notificationId)
      .where('user_id', '=', userId)
      .execute();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db
      .updateTable('notifications')
      .set({ read_at: new Date() })
      .where('user_id', '=', userId)
      .where('read_at', 'is', null)
      .execute();
  }

  // Helper to notify about request status change
  async notifyStatusChange(
    userId: string,
    requestTitle: string,
    oldStatus: string,
    newStatus: string,
    requestId: string,
  ): Promise<void> {
    await this.create({
      user_id: userId,
      type: 'request_status_changed',
      title: 'Request Status Updated',
      message: `Your request for "${requestTitle}" has been updated from ${oldStatus} to ${newStatus}`,
      reference_type: 'movie_request',
      reference_id: requestId,
    });
  }

  // Helper to notify about request fulfillment
  async notifyRequestFulfilled(
    userId: string,
    requestTitle: string,
    movieTitle: string,
    requestId: string,
  ): Promise<void> {
    await this.create({
      user_id: userId,
      type: 'request_matched',
      title: 'Request Fulfilled',
      message: `Your request for "${requestTitle}" has been fulfilled! "${movieTitle}" is now available.`,
      reference_type: 'movie_request',
      reference_id: requestId,
    });
  }

  // Helper to notify about new comment
  async notifyNewComment(
    userId: string,
    requestTitle: string,
    commenterName: string,
    requestId: string,
  ): Promise<void> {
    await this.create({
      user_id: userId,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenterName} commented on your request for "${requestTitle}"`,
      reference_type: 'movie_request',
      reference_id: requestId,
    });
  }
}
