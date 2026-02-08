import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getMovieRequests } from '../api/requests';

interface RequestedMoviesContextType {
  requestedMovieIds: Set<string>;
  addRequestedMovie: (movieId: string) => void;
  removeRequestedMovie: (movieId: string) => void;
  isMovieRequested: (movieId: string) => boolean;
}

const RequestedMoviesContext = createContext<RequestedMoviesContextType | undefined>(undefined);

const STORAGE_KEY = 'requestedMovieIds';

function loadRequestedMoviesFromStorage(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
        return new Set(parsed);
      }
    }
  } catch (error) {
    console.error('Failed to load requested movies from localStorage:', error);
  }
  return new Set();
}

function saveRequestedMoviesToStorage(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (error) {
    console.error('Failed to save requested movies to localStorage:', error);
  }
}

export function RequestedMoviesProvider({ children }: { children: ReactNode }) {
  const [requestedMovieIds, setRequestedMovieIds] = useState<Set<string>>(
    () => loadRequestedMoviesFromStorage()
  );

  // Sync with server on mount
  useEffect(() => {
    async function syncWithServer() {
      try {
        const requests = await getMovieRequests();
        const requestedIds = new Set(
          requests
            .filter((req) => req.status !== 'completed')
            .map((req) => req.omdb_id)
            .filter((id): id is string => Boolean(id))
        );
        setRequestedMovieIds(requestedIds);
      } catch (error) {
        // Silent fail - use localStorage data
        console.error('Failed to sync requested movies with server:', error);
      }
    }

    void syncWithServer();
  }, []);

  useEffect(() => {
    saveRequestedMoviesToStorage(requestedMovieIds);
  }, [requestedMovieIds]);

  const addRequestedMovie = (movieId: string) => {
    setRequestedMovieIds((prev) => {
      if (prev.has(movieId)) return prev;
      const next = new Set(prev);
      next.add(movieId);
      return next;
    });
  };

  const removeRequestedMovie = (movieId: string) => {
    setRequestedMovieIds((prev) => {
      if (!prev.has(movieId)) return prev;
      const next = new Set(prev);
      next.delete(movieId);
      return next;
    });
  };

  const isMovieRequested = (movieId: string) => {
    return requestedMovieIds.has(movieId);
  };

  return (
    <RequestedMoviesContext.Provider
      value={{ requestedMovieIds, addRequestedMovie, removeRequestedMovie, isMovieRequested }}
    >
      {children}
    </RequestedMoviesContext.Provider>
  );
}

export function useRequestedMovies() {
  const context = useContext(RequestedMoviesContext);
  if (!context) {
    throw new Error('useRequestedMovies must be used within RequestedMoviesProvider');
  }
  return context;
}
