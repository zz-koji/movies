import { z } from 'zod/v4'

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
	Ratings: z.array(z.object({
		Source: z.string(),
		Value: z.string()
	})),
	Metascore: z.string(),
	imdbRating: z.string(),
	imdbVotes: z.string(),
	imdbID: z.string(),
	Type: z.string(),
	DVD: z.string().optional(),
	BoxOffice: z.string().optional(),
	Production: z.string().optional(),
	Website: z.string().optional(),
	Response: z.literal('True')
})

export type OmdbMovie = z.infer<typeof omdbMovieSchema>
