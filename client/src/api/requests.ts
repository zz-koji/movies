import type { MovieRequest } from '../types';

export type ExtendedMovieRequest = MovieRequest & {
  id: string;
  submittedAt: string;
  status: 'queued' | 'processing' | 'completed';
};

const LOCAL_REQUESTS: ExtendedMovieRequest[] = [];

export async function getMovieRequests(): Promise<ExtendedMovieRequest[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return LOCAL_REQUESTS;
}

export async function addMovieRequest(request: MovieRequest): Promise<ExtendedMovieRequest> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const newRequest: ExtendedMovieRequest = {
    ...request,
    id: `rq-${Date.now()}`,
    submittedAt: 'Just now',
    status: 'queued'
  };

  LOCAL_REQUESTS.unshift(newRequest);
  return newRequest;
}

export async function updateRequestStatus(
  requestId: string,
  status: ExtendedMovieRequest['status']
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const request = LOCAL_REQUESTS.find(r => r.id === requestId);
  if (request) {
    request.status = status;
  }
}