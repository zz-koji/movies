import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  getMovieRequests,
  createMovieRequest,
  deleteMovieRequest,
  type ExtendedMovieRequest,
} from '../api/requests';
import type { MovieRequest } from '../types';

const QUERY_KEY = ['movie-requests'];

export function useMovieRequests() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMovieRequests,
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MovieRequest) => createMovieRequest(request),
    onMutate: async (newRequest) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      // Snapshot previous value
      const previousRequests = queryClient.getQueryData<ExtendedMovieRequest[]>(QUERY_KEY);

      // Optimistically update
      queryClient.setQueryData<ExtendedMovieRequest[]>(QUERY_KEY, (old = []) => [
        {
          ...newRequest,
          id: `temp-${Date.now()}`,
          date_requested: new Date().toISOString(),
          requested_by: 'current-user',
          status: 'queued' as const,
        },
        ...old,
      ]);

      return { previousRequests };
    },
    onError: (error, _newRequest, context) => {
      // Rollback on error
      if (context?.previousRequests) {
        queryClient.setQueryData(QUERY_KEY, context.previousRequests);
      }
      notifications.show({
        title: 'Request failed',
        message: error instanceof Error ? error.message : 'Failed to submit movie request',
        color: 'red',
      });
    },
    onSuccess: () => {
      notifications.show({
        title: 'Request submitted',
        message: 'Your movie request has been added to the queue',
        color: 'teal',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => deleteMovieRequest(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });

      const previousRequests = queryClient.getQueryData<ExtendedMovieRequest[]>(QUERY_KEY);

      // Optimistically remove
      queryClient.setQueryData<ExtendedMovieRequest[]>(QUERY_KEY, (old = []) =>
        old.filter((req) => req.id !== requestId)
      );

      return { previousRequests };
    },
    onError: (error, _requestId, context) => {
      if (context?.previousRequests) {
        queryClient.setQueryData(QUERY_KEY, context.previousRequests);
      }
      notifications.show({
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete movie request',
        color: 'red',
      });
    },
    onSuccess: () => {
      notifications.show({
        title: 'Request deleted',
        message: 'Movie request has been removed from the queue',
        color: 'blue',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
