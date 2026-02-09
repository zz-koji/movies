import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMovieRequest } from '../api/requests';
import { useRequestedMovies } from '../context/RequestedMoviesContext';
import type { Movie } from '../types';

export function useQuickRequest() {
  const { addRequestedMovie, isMovieRequested } = useRequestedMovies();
  const [requestingMovieId, setRequestingMovieId] = useState<string | null>(null);
  const [requestingImdbId, setRequestingImdbId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (movie: Movie) => {
      return await createMovieRequest({
        title: movie.title,
        priority: 'medium',
        notes: undefined,
        omdb_id: movie.id
        // omdb_id will be undefined - admin can link it later
      });
    },
    onSuccess: (_data, movie) => {
      addRequestedMovie(movie.id);
      toast.success(`✓ ${movie.title} requested`);
      setRequestingMovieId(null);
      setRequestingImdbId(null);
    },
    onError: (error, _movie) => {
      const message = error instanceof Error ? error.message : 'Request failed';
      toast.error(`⚠ ${message}`);
      setRequestingMovieId(null);
      setRequestingImdbId(null);  
    },
  });

  const quickRequest = (movie: Movie) => {
    console.log('Movie requested: ', movie)
    if (isMovieRequested(movie.id)) {
      return;
    }
    setRequestingMovieId(movie.id);
    mutation.mutate(movie);
  };

  return {
    quickRequest,
    isRequesting: (movieId: string) => requestingMovieId === movieId,
    isRequested: isMovieRequested,
  };
}
