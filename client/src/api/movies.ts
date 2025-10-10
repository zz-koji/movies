import type { Movie } from '../types';

type LocalMovieRecord = {
  id: string;
  title: string;
  description: string;
  movie_file_key: string;
  subtitle_file_key?: string | null;
  omdb_id: string;
  metadata?: unknown;
};

export type MovieLibraryPagination = {
  page: number;
  limit: number;
  subTotal?: number;
  comingSoon?: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

type PaginatedLocalMoviesResponse = {
  data?: LocalMovieRecord[];
  pagination?: Partial<MovieLibraryPagination>;
};

type GetMovieLibraryOptions = {
  page?: number;
  limit?: number;
  query?: string;
  genre?: string;
  year?: number;
  rating?: number;
  available?: boolean;
};

export type MovieLibraryResult = {
  movies: Movie[];
  pagination: MovieLibraryPagination;
};

const FALLBACK_MOVIES: Movie[] = [];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const DEFAULT_LIBRARY_PAGE_SIZE = 10;

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

async function hydrateLocalMovieRecords(records: LocalMovieRecord[]): Promise<Movie[]> {
  const movies: Movie[] = [];

  for (const record of records) {
    const omdbMovie = record.metadata ?? await fetchOmdbMovie(record.omdb_id);
    movies.push(transformLocalMovie(record, omdbMovie));
  }

  return movies;
}

function parseNumeric(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildFallbackPagination(total: number): MovieLibraryPagination {
  const limit = Math.max(1, total);

  return {
    page: 1,
    limit,
    total,
    totalPages: total > 0 ? 1 : 0,
    hasNextPage: false,
  };
}

async function requestLocalMovies(
  params: URLSearchParams,
  fallback: { page: number; limit: number },
): Promise<{ records: LocalMovieRecord[]; pagination: MovieLibraryPagination }> {
  const queryString = params.size > 0 ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/movies/local${queryString}`);

  if (!response.ok) {
    throw new Error(`Failed to load local library: ${response.statusText}`);
  }

  const payload: PaginatedLocalMoviesResponse | LocalMovieRecord[] = await response.json();
  const records: LocalMovieRecord[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  const paginationSource = Array.isArray(payload) ? undefined : payload.pagination;
  const total = parseNumeric(paginationSource?.total, records.length);
  const subTotal = paginationSource?.subTotal ? paginationSource.subTotal : 0
  const comingSoon = paginationSource?.comingSoon ? paginationSource?.comingSoon : 0
  const page = parseNumeric(paginationSource?.page, fallback.page);
  const limit = parseNumeric(paginationSource?.limit, fallback.limit);
  const totalPages = total > 0 && limit > 0 ? Math.ceil(total / limit) : 0;
  const hasNextPage = typeof paginationSource?.hasNextPage === 'boolean'
    ? paginationSource.hasNextPage
    : page < totalPages;


  return {
    records,
    pagination: {
      page,
      limit,
      total,
      subTotal,
      comingSoon,
      totalPages,
      hasNextPage,
    },
  };
}

export async function getMovieLibrary(
  options: GetMovieLibraryOptions = {},
): Promise<MovieLibraryResult> {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : DEFAULT_LIBRARY_PAGE_SIZE;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const trimmedQuery = options.query?.trim();
  if (trimmedQuery) {
    params.set('query', trimmedQuery);
  }

  const trimmedGenre = options.genre?.trim();
  if (trimmedGenre) {
    params.set('genre', trimmedGenre);
  }

  if (typeof options.year === 'number') {
    params.set('year', String(options.year));
  }

  if (typeof options.rating === 'number') {
    params.set('rating', String(options.rating));
  }

  if (typeof options.available === 'boolean') {
    params.set('available', String(options.available));
  }

  const fallback = { page, limit };

  try {
    const { records, pagination } = await requestLocalMovies(params, fallback);

    if (records.length === 0) {
      return {
        movies: [],
        pagination,
      };
    }

    const movies = await hydrateLocalMovieRecords(records);

    return {
      movies,
      pagination,
    };
  } catch (error) {
    console.error('Falling back to demo movies because loading the local library failed', error);
    const fallbackMovies = [...FALLBACK_MOVIES];
    const pagination = fallbackMovies.length > 0
      ? buildFallbackPagination(fallbackMovies.length)
      : buildFallbackPagination(0);

    return {
      movies: fallbackMovies,
      pagination,
    };
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

export async function deleteMovieFromLibrary(omdbId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/movies/local/${encodeURIComponent(omdbId)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || 'Failed to delete movie.');
  }
}
