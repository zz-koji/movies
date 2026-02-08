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


export const localMovieSchema = z.object({
  id: z.uuid(),
  omdb_id: z.string(),
  title: z.string(),
  description: z.string(),
  movie_file_key: z.string(),
  subtitle_file_key: z.string().optional(),
});

export type LocalMovie = z.infer<typeof localMovieSchema>

export const omdbMovieSchema = z.object({
  Title: z.string(),
  Year: z.string(),
  Rated: z.string(),
  Released: z.string(),
  Runtime: z.string(),
  Genre: z.string(),
  Director: z.string(),
  Writer: z.string(),
  Actors: z.string(),
  Plot: z.string(),
  Language: z.string(),
  Country: z.string(),
  Awards: z.string(),
  Poster: z.string(),
  Ratings: z.array(
    z.object({
      Source: z.string(),
      Value: z.string(),
    }),
  ),
  Metascore: z.string(),
  imdbRating: z.string(),
  imdbVotes: z.string(),
  imdbID: z.string(),
  Type: z.string(),
  DVD: z.string().optional(),
  BoxOffice: z.string().optional(),
  Production: z.string().optional(),
  Website: z.string().optional(),
  Response: z.literal('True'),
});

export type OmdbMovie = z.infer<typeof omdbMovieSchema>;


export const movieRequestSchema = z.object({
  title: z.string().min(1, 'Movie title is required'),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  omdb_id: z.string().optional(),
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
