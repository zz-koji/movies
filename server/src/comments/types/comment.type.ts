import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const commentSchema = z.object({
  id: z.uuid(),
  request_id: z.uuid(),
  user_id: z.uuid(),
  content: z.string().min(1).max(2000),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Comment = z.infer<typeof commentSchema>;

export type CommentTable = {
  id: Generated<string>;
  request_id: string;
  user_id: string;
  content: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CreateCommentSchema = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = createCommentSchema.partial();
export type UpdateCommentSchema = z.infer<typeof updateCommentSchema>;

// Extended comment with user info for display
export interface CommentWithUser extends Comment {
  username: string;
}
