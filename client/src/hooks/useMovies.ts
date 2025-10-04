import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getMovies, getMovie, type GetMoviesRequest, type GetMovieRequest } from '../api/server';
import type { Movie, SearchFilters } from '../types';
import { getMovieLibrary } from '../api/movies';

function transformOmdbMovies(omdbMovies: any[]) {
  return omdbMovies.map((serverMovie: any) => ({
    id: serverMovie.imdbID,
    title: serverMovie.Title,
    description: serverMovie.Plot || 'No description available',
    year: parseInt(serverMovie.Year) || 0,
    genre: serverMovie.Genre ? serverMovie.Genre.split(', ') : [],
    rating: parseFloat(serverMovie.imdbRating) || 0,
    duration: 0, // Not available from server
    director: serverMovie.Director || 'Unknown',
    cast: serverMovie.Actors ? serverMovie.Actors.split(', ') : [],
    available: false, // Server movies are not in local library
    poster: serverMovie.Poster !== 'N/A' ? serverMovie.Poster : undefined
  }));
}

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
  sortBy: 'featured' | 'rating' | 'year';
}

export function useMovieLibrary({
  filters,
  debouncedQuery,
  sortBy,
}: UseMovieLibraryParams): { movies: Movie[], isLoading: boolean, error: Error | null } {
  const [movies, setMovies] = useState<Movie[]>([])
  const [localLibrary, setLocalLibrary] = useState<Movie[]>([])
  const isQuery = debouncedQuery.length >= 2

  const sortMovies = useCallback((list: Movie[]) => {
    const sorted = [...list]
    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating)
      case 'year':
        return sorted.sort((a, b) => b.year - a.year)
      default:
        return sorted.sort((a, b) => {
          if (a.available === b.available) {
            return b.rating - a.rating
          }
          return a.available ? -1 : 1
        })
    }
  }, [sortBy])

  const applyFilters = useCallback((list: Movie[]) => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase()

    return list.filter((movie) => {
      if (normalizedQuery && !movie.title.toLowerCase().includes(normalizedQuery)) {
        return false
      }

      if (filters.genre && !movie.genre.includes(filters.genre)) {
        return false
      }

      if (filters.year && movie.year !== filters.year) {
        return false
      }

      if (filters.rating && movie.rating < filters.rating) {
        return false
      }

      if (typeof filters.available === 'boolean' && movie.available !== filters.available) {
        return false
      }

      return true
    })
  }, [
    debouncedQuery,
    filters.available,
    filters.genre,
    filters.rating,
    filters.year,
  ])

  useEffect(() => {
    const loadData = async () => {
      const library = await getMovieLibrary()
      setLocalLibrary(library)
    }

    void loadData()
  }, [])

  const {
    data: omdbMovies,
    isLoading,
    error
  } = useMovies(
    { title: debouncedQuery, page: 1 },
    isQuery
  );

  useEffect(() => {
    if (!isQuery) {
      const filtered = applyFilters(localLibrary)
      const sorted = sortMovies(filtered)
      setMovies(sorted)
      return
    }

    if (omdbMovies?.Search?.length) {
      const transformed = transformOmdbMovies(omdbMovies.Search)
      setMovies(sortMovies(transformed))
      return
    }

    if (!isLoading && isQuery) {
      setMovies([])
    }
  }, [
    applyFilters,
    isLoading,
    isQuery,
    localLibrary,
    omdbMovies,
    sortMovies,
  ])


  return {
    movies,
    isLoading,
    error
  };
}
