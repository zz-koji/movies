import type { Movie } from '../types';

export const LOCAL_MOVIES: Movie[] = [];

export async function getMovieLibrary(): Promise<Movie[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return LOCAL_MOVIES;
}

export async function addMovieToLibrary(movie: Movie): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  LOCAL_MOVIES.push(movie);
}

export async function updateMovieAvailability(movieId: string, available: boolean): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const movie = LOCAL_MOVIES.find(m => m.id === movieId);
  if (movie) {
    movie.available = available;
  }
}