import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getMovies, getMovie, type GetMoviesRequest, type GetMovieRequest } from '../api/server';
import type { Movie, SearchFilters } from '../types';
import { getMovieLibrary, type MovieLibraryPagination } from '../api/movies';

export function useMovies(params: GetMoviesRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: ['movies', params],
    queryFn: () => getMovies(params),
    enabled: enabled && !!params.title && params.title.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMovie(params: GetMovieRequest, enabled: boolean = true) {
  return useQuery({
    queryKey: ['movie', params],
    queryFn: () => getMovie(params),
    enabled: enabled && (!!params.id || !!params.title),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

interface UseMovieLibraryParams {
  filters: SearchFilters;
  debouncedQuery: string;
  sortBy: 'title' | 'rating' | 'year';
}

export type LibraryStats = MovieLibraryPagination | null;

const LOCAL_LIBRARY_PAGE_SIZE = 9;

export function useMovieLibrary({
  filters,
  debouncedQuery,
  sortBy,
}: UseMovieLibraryParams): {
  movies: Movie[];
  isLoading: boolean;
  error: Error | null;
  reloadLocalLibrary: () => Promise<void>;
  loadMoreLocalMovies: () => Promise<void>;
  hasMoreLocalMovies: boolean;
  isLoadingMoreLocalMovies: boolean;
  isSearching: boolean;
  stats: LibraryStats;
} {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [localLibrary, setLocalLibrary] = useState<Movie[]>([]);
  const [localPagination, setLocalPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  }>({
    page: 0,
    limit: LOCAL_LIBRARY_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
  });
  const [localError, setLocalError] = useState<Error | null>(null);
  const [isLoadingLocalLibrary, setIsLoadingLocalLibrary] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | undefined>(undefined);
  const [localStats, setLocalStats] = useState<LibraryStats | null>(null); // NEW
  const activeFiltersRef = useRef<Partial<Omit<SearchFilters, 'query'>>>({});

  const isQuery = debouncedQuery.trim().length >= 2;

  const sortMovies = useCallback(
    (list: Movie[]) => {
      const sorted = [...list];
      switch (sortBy) {
        case 'rating':
          return sorted.sort((a, b) => b.rating - a.rating);
        case 'year':
          return sorted.sort((a, b) => b.year - a.year);
        case 'title':
        default:
          return sorted.sort((a, b) => a.title.localeCompare(b.title));
      }
    },
    [sortBy],
  );

  const loadLocalLibrary = useCallback(
    async ({
      page = 1,
      append = false,
      query,
    }: { page?: number; append?: boolean; query?: string } = {}) => {
      setIsLoadingLocalLibrary(true);

      const normalizedQuery = query?.trim();
      const currentFilters: Partial<Omit<SearchFilters, 'query'>> = {
        genre: filters.genre,
        year: filters.year,
        rating: filters.rating,
        available: filters.available,
      };
      const effectiveFilters = append ? activeFiltersRef.current : currentFilters;

      if (!append) {
        setLocalLibrary([]);
        setActiveQuery(normalizedQuery);
        activeFiltersRef.current = { ...currentFilters };
      } else if (normalizedQuery !== undefined && normalizedQuery !== activeQuery) {
        setActiveQuery(normalizedQuery);
      }

      try {
        const requestOptions: Parameters<typeof getMovieLibrary>[0] = {
          page,
          limit: LOCAL_LIBRARY_PAGE_SIZE,
          ...(normalizedQuery ? { query: normalizedQuery } : {}),
        };

        if (effectiveFilters?.genre) requestOptions.genre = effectiveFilters.genre;
        if (typeof effectiveFilters?.year === 'number') requestOptions.year = effectiveFilters.year;
        if (typeof effectiveFilters?.rating === 'number') requestOptions.rating = effectiveFilters.rating;
        if (typeof effectiveFilters?.available === 'boolean') requestOptions.available = effectiveFilters.available;

        const raw = await getMovieLibrary(requestOptions)



        const pageMovies: Movie[] = raw.movies
        const pagination = raw.pagination
        const stats: LibraryStats = raw.pagination;
        setLocalPagination(pagination);
        setLocalStats(stats); // NEW
        setLocalError(null);
        setLocalLibrary((prev) => (append ? [...prev, ...pageMovies] : pageMovies));
      } catch (error) {
        console.error('Failed to load local library', error);
        const normalizedError = error instanceof Error ? error : new Error('Failed to load local library');
        setLocalError(normalizedError);

        if (!append) {
          setLocalLibrary([]);
          setLocalStats(null); // NEW
          setLocalPagination({
            page,
            limit: LOCAL_LIBRARY_PAGE_SIZE,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
          });
          setActiveQuery(undefined);
          activeFiltersRef.current = {};
        }
      } finally {
        setIsLoadingLocalLibrary(false);
      }
    },
    [activeQuery, filters.available, filters.genre, filters.rating, filters.year],
  );

  const reloadLocalLibrary = useCallback(async () => {
    await loadLocalLibrary({ page: 1, append: false, query: activeQuery });
  }, [activeQuery, loadLocalLibrary]);

  const loadMoreLocalMovies = useCallback(async () => {
    if (isLoadingLocalLibrary || !localPagination.hasNextPage) return;

    await loadLocalLibrary({
      page: localPagination.page + 1,
      append: true,
      query: activeQuery,
    });
  }, [activeQuery, isLoadingLocalLibrary, loadLocalLibrary, localPagination]);

  useEffect(() => {
    const queryParam = isQuery ? debouncedQuery : undefined;
    void loadLocalLibrary({ page: 1, append: false, query: queryParam });
  }, [debouncedQuery, isQuery, loadLocalLibrary]);

  useEffect(() => {
    setMovies(sortMovies(localLibrary));
  }, [localLibrary, sortMovies]);

  const combinedLoading = isLoadingLocalLibrary && movies.length === 0;
  const combinedError = localError;
  const isLoadingMoreLocalMovies = isLoadingLocalLibrary && localLibrary.length > 0;

  return {
    movies,
    isLoading: combinedLoading,
    error: combinedError,
    reloadLocalLibrary,
    loadMoreLocalMovies,
    hasMoreLocalMovies: localPagination.hasNextPage,
    isLoadingMoreLocalMovies,
    isSearching: Boolean(activeQuery && activeQuery.length >= 2),
    stats: localStats, // NEW
  };
}

