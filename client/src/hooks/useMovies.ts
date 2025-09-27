import { useQuery } from '@tanstack/react-query';
import { getMovies, getMovie, type GetMoviesRequest, type GetMovieRequest } from '../api/server';

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