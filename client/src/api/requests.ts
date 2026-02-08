import type { MovieRequest } from '../types';

const VITE_PUBLIC_API_BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL || '/api';

export type ExtendedMovieRequest = MovieRequest & {
  id: string;
  date_requested: string;
  date_completed?: string | null;
  requested_by: string;
  status: 'queued' | 'processing' | 'completed';
  omdb_id?: string | null;
};

export async function getMovieRequests(): Promise<ExtendedMovieRequest[]> {
  const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch movie requests: ${response.statusText}`);
  }

  return response.json();
}

export async function createMovieRequest(request: MovieRequest): Promise<ExtendedMovieRequest> {
  const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create movie request: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteMovieRequest(requestId: string): Promise<void> {
  const response = await fetch(`${VITE_PUBLIC_API_BASE_URL}/movie-requests/${requestId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete movie request: ${response.statusText}`);
  }
}