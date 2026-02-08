import { useDisclosure } from '@mantine/hooks';
import { useCreateRequest, useDeleteRequest, useMovieRequests } from './useMovieRequests';
import type { MovieRequest } from '../types';

export function useMovieRequest() {
  const { data: movieRequests = [], isLoading } = useMovieRequests();
  const createMutation = useCreateRequest();
  const deleteMutation = useDeleteRequest();

  const handleMovieRequest = async (movieRequest: MovieRequest) => {
    await createMutation.mutateAsync(movieRequest);
  };

  const handleDeleteRequest = async (requestId: string) => {
    await deleteMutation.mutateAsync(requestId);
  };

  const [movieRequestModalOpened, { open: openMovieRequestModal, close: closeMovieRequestModal }] =
    useDisclosure(false);

  return {
    handleMovieRequest,
    handleDeleteRequest,
    movieRequests,
    isLoading,
    isSubmitting: createMutation.isPending,
    modal: { movieRequestModalOpened, openMovieRequestModal, closeMovieRequestModal },
  };
}



