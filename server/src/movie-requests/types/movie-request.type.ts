import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const requestStatusSchema = z.enum(['queued', 'processing', 'completed']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const requestPrioritySchema = z.enum(['low', 'medium', 'high']);
export type RequestPriority = z.infer<typeof requestPrioritySchema>;

export const movieRequestSchema = z.object({
  id: z.uuid(),
  omdb_id: z.string().max(20).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  priority: requestPrioritySchema.default('medium'),
  status: requestStatusSchema.default('queued'),
  notes: z.string().optional().nullable(),
  date_requested: z.date().default(new Date()),
  date_completed: z.date().optional().nullable(),
  requested_by: z.uuid(),
  fulfilled_by: z.uuid().optional().nullable(),
  fulfilled_at: z.date().optional().nullable(),
  fulfilled_movie_id: z.uuid().optional().nullable(),
});

export type MovieRequest = z.infer<typeof movieRequestSchema>;
export type MovieRequestTable = MovieRequest & {
  id: Generated<string>;
  fulfilled_by: string | null;
  fulfilled_at: Date | null;
  fulfilled_movie_id: string | null;
};

export const createMovieRequestSchema = movieRequestSchema.omit({
  id: true,
  date_requested: true,
  date_completed: true,
  fulfilled_by: true,
  fulfilled_at: true,
  fulfilled_movie_id: true,
});

export type CreateMovieRequestSchema = z.infer<typeof createMovieRequestSchema>;

export const updateMovieRequestSchema = z.object({
  title: z.string().max(255).optional(),
  priority: requestPrioritySchema.optional(),
  status: requestStatusSchema.optional(),
  notes: z.string().optional().nullable(),
  omdb_id: z.string().max(20).optional().nullable(),
});

export type UpdateMovieRequestSchema = z.infer<typeof updateMovieRequestSchema>;

// Admin-only update schema with fulfillment fields
export const adminUpdateMovieRequestSchema = updateMovieRequestSchema.extend({
  fulfilled_movie_id: z.uuid().optional().nullable(),
});

export type AdminUpdateMovieRequestSchema = z.infer<typeof adminUpdateMovieRequestSchema>;

// Extended request with user info for display
export interface MovieRequestWithUser extends MovieRequest {
  requester_name: string;
  fulfilled_by_name?: string | null;
}
