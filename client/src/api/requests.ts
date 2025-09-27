import type { MovieRequest } from '../types';

export type ExtendedMovieRequest = MovieRequest & {
  id: string;
  submittedAt: string;
  status: 'queued' | 'processing' | 'completed';
};

const LOCAL_REQUESTS: ExtendedMovieRequest[] = [
  {
    id: 'rq-1',
    title: 'Inside Out 2',
    requestedBy: 'Alex',
    priority: 'high',
    description: 'Great for our next family movie night.',
    submittedAt: '2 days ago',
    status: 'queued'
  },
  {
    id: 'rq-2',
    title: 'Top Gun: Maverick',
    requestedBy: 'Sam',
    priority: 'medium',
    description: 'Would love to watch the aerial sequences in 4K.',
    submittedAt: '1 week ago',
    status: 'processing'
  }
];

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