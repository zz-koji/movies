import type { Movie } from '../types';

type LocalMovieRecord = {
  id: string;
  title: string;
  description: string;
  movie_file_key: string;
  subtitle_file_key?: string | null;
  omdb_id: string;
};

const FALLBACK_MOVIES: Movie[] = [];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

function parseRuntime(runtime?: string): number {
  if (!runtime) return 0;
  const minutes = runtime.match(/(\d+)/);
  return minutes ? Number.parseInt(minutes[1] ?? '0', 10) : 0;
}

function transformLocalMovie(record: LocalMovieRecord, omdbMovie: any | null): Movie {
  const runtime = parseRuntime(omdbMovie?.Runtime);

  return {
    id: record.omdb_id,
    title: omdbMovie?.Title ?? record.title,
    description: record.description || omdbMovie?.Plot || 'No description available.',
    year: Number.parseInt(omdbMovie?.Year ?? '0', 10) || new Date().getFullYear(),
    genre: omdbMovie?.Genre ? omdbMovie.Genre.split(',').map((value: string) => value.trim()) : [],
    rating: Number.parseFloat(omdbMovie?.imdbRating ?? '0') || 0,
    poster: omdbMovie?.Poster && omdbMovie.Poster !== 'N/A' ? omdbMovie.Poster : undefined,
    duration: runtime,
    director: omdbMovie?.Director ?? 'Unknown',
    cast: omdbMovie?.Actors ? omdbMovie.Actors.split(',').map((value: string) => value.trim()) : [],
    available: true,
    hasVideo: true,
    videoQualities: ['Original'],
    videoFormat: omdbMovie?.Type ? omdbMovie.Type.toUpperCase() : 'MP4',
  };
}

async function fetchOmdbMovie(omdbId: string): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/movie?id=${encodeURIComponent(omdbId)}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch OMDb details', error);
    return null;
  }
}

export async function getMovieLibrary(): Promise<Movie[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/movies/local`);
    if (!response.ok) {
      throw new Error(`Failed to load local library: ${response.statusText}`);
    }

    const localMovies: LocalMovieRecord[] = await response.json();
    if (!Array.isArray(localMovies) || localMovies.length === 0) {
      return [];
    }

    const movies = await Promise.all(
      localMovies.map(async (record) => {
        const omdbMovie = await fetchOmdbMovie(record.omdb_id);
        return transformLocalMovie(record, omdbMovie);
      })
    );

    return movies;
  } catch (error) {
    console.error('Falling back to demo movies because loading the local library failed', error);
    return FALLBACK_MOVIES;
  }
}

export async function addMovieToLibrary(movie: Movie): Promise<void> {
  FALLBACK_MOVIES.push(movie);
}

export async function updateMovieAvailability(movieId: string, available: boolean): Promise<void> {
  const movie = FALLBACK_MOVIES.find((item) => item.id === movieId);
  if (movie) {
    movie.available = available;
  }
}
