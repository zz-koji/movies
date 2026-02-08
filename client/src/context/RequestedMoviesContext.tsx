import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
      const arr = JSON.parse(stored) as string[];
      return new Set(arr);
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

  useEffect(() => {
    saveRequestedMoviesToStorage(requestedMovieIds);
  }, [requestedMovieIds]);

  const addRequestedMovie = (movieId: string) => {
    setRequestedMovieIds((prev) => {
      const next = new Set(prev);
      next.add(movieId);
      return next;
    });
  };

  const removeRequestedMovie = (movieId: string) => {
    setRequestedMovieIds((prev) => {
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
