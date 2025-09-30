import { z } from 'zod/v4';

export type Movie = {
  id: string;
  title: string;
  description: string;
  year: number;
  genre: string[];
  rating: number;
  poster?: string;
  duration: number;
  director: string;
  cast: string[];
  available: boolean;
  hasVideo?: boolean;
  videoQualities?: string[];
  fileSize?: number;
  videoFormat?: string;
}

export const movieRequestSchema = z.object({
  title: z.string().min(1, 'Movie title is required'),
  year: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const yearNum = parseInt(val, 10);
        return !isNaN(yearNum) && yearNum >= 1800 && yearNum <= 2100;
      },
      { message: 'Year must be between 1800 and 2100' }
    ),
  description: z.string().optional(),
  requestedBy: z.string().min(1, 'Your name is required'),
  priority: z.enum(['low', 'medium', 'high'])
});

export type MovieRequest = z.infer<typeof movieRequestSchema>;

export const loginSchema = z.object({
  name: z.string().min(1, 'Username is required'),
  pin: z.string().min(6, 'PIN is required')
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export type SearchFilters = {
  query: string;
  genre?: string;
  year?: number;
  rating?: number;
  available?: boolean;
}
