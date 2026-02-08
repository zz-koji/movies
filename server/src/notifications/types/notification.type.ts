import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const notificationTypeSchema = z.enum([
  'request_status_changed',
  'request_matched',
  'comment_added',
  'role_changed',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  type: notificationTypeSchema,
  title: z.string().max(255),
  message: z.string(),
  reference_type: z.string().max(50).nullable().optional(),
  reference_id: z.uuid().nullable().optional(),
  read_at: z.date().nullable().optional(),
  created_at: z.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

export type NotificationTable = {
  id: Generated<string>;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  read_at: Date | null;
  created_at: Generated<Date>;
};

export const createNotificationSchema = notificationSchema.omit({
  id: true,
  read_at: true,
  created_at: true,
});
export type CreateNotificationSchema = z.infer<typeof createNotificationSchema>;
