import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const movieRequestSchema = z.object({
  id: z.uuid(),
  imdb_id: z.string().max(20),
  date_requested: z.date().default(new Date()),
  date_completed: z.date().optional().nullable(),
  requested_by: z.uuid(),
});

export type MovieRequest = z.infer<typeof movieRequestSchema>;
export type MovieRequestTable = MovieRequest & { id: Generated<string> };

export const createMovieRequestSchema = movieRequestSchema.omit({ id: true });

export type CreateMovieRequestSchema = z.infer<typeof createMovieRequestSchema>;
