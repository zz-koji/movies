import type { Movie } from '../types';

type LocalMovieRecord = {
  id: string;
  title: string;
  description: string;
  movie_file_key: string | null;
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
  totalRuntime?: number;
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
  sortBy?: 'title' | 'rating' | 'year'
  rating?: number;
  available?: boolean;
};

export type MovieLibraryResult = {
  movies: Movie[];
  pagination: MovieLibraryPagination;
};

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
    available: !!record.movie_file_key,
    hasVideo: !!record.movie_file_key,
    hasSubtitles: !!record.subtitle_file_key,
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

async function requestLocalMovies(
  params: URLSearchParams,
  fallback: { page: number; limit: number, sortBy: 'title' | 'year' | 'rating' },
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
  const totalRuntime = paginationSource?.totalRuntime ? paginationSource?.totalRuntime : 0
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
      totalRuntime,
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
  const sortBy = options.sortBy ? options.sortBy : 'title'

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: String(sortBy)
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

  const fallback = { page, limit, sortBy };

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

type GetCatalogOptions = {
  query?: string;
  page?: number;
  limit?: number;
};

type CatalogMovie = {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
  available: boolean;
  requested: boolean;
};

type CatalogResponse = {
  data: CatalogMovie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export async function getMovieCatalog(
  options: GetCatalogOptions = {},
): Promise<{ movies: Movie[]; pagination: MovieLibraryPagination }> {
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

  const queryString = params.size > 0 ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/movies/catalog${queryString}`);

  if (!response.ok) {
    throw new Error(`Failed to load catalog: ${response.statusText}`);
  }

  const result: CatalogResponse = await response.json();

  const movies: Movie[] = result.data.map((item) => ({
    id: item.imdbID,
    title: item.Title,
    description: 'No description available.',
    year: Number.parseInt(item.Year, 10) || new Date().getFullYear(),
    genre: [],
    rating: 0,
    poster: item.Poster && item.Poster !== 'N/A' ? item.Poster : undefined,
    duration: 0,
    director: 'Unknown',
    cast: [],
    available: item.available,
    requested: item.requested,
    hasVideo: item.available,
    videoQualities: ['Original'],
    videoFormat: 'MP4',
  }));

  return {
    movies,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
      hasNextPage: result.pagination.hasNextPage,
    },
  };
}
