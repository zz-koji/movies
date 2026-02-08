# Phase 1: Quick Request Foundation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable one-tap movie requests directly from movie cards with toast notifications and persistent state tracking.

**Architecture:** Add inline request button to unavailable movie cards, implement quick request API, add toast notification system, track requested state in context + localStorage.

**Tech Stack:** React, Mantine UI, React Query, Zod, localStorage, react-hot-toast

---

## Task 1: Install Toast Notification Library

**Files:**
- Modify: `client/package.json`

**Step 1: Install react-hot-toast**

Run from `/home/koji/coding/movies/.worktrees/feature/ux-improvements/client`:
```bash
npm install react-hot-toast
```

Expected: Package added to dependencies

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-hot-toast for notifications"
```

---

## Task 2: Create Requested Movies Context

**Files:**
- Create: `client/src/context/RequestedMoviesContext.tsx`

**Step 1: Write the context implementation**

Create `client/src/context/RequestedMoviesContext.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
```

**Step 2: Verify TypeScript compiles**

Run from client directory:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/context/RequestedMoviesContext.tsx
git commit -m "feat: add requested movies context with localStorage persistence"
```

---

## Task 3: Integrate Context and Toast into App

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Add imports and providers**

Modify `client/src/App.tsx`:

```tsx
import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovieDashboard } from './components/MovieDashboard'
import { AuthProvider } from './context/AuthContext'
import { RequestedMoviesProvider } from './context/RequestedMoviesContext'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

function App() {
  return (
    <AuthProvider>
      <RequestedMoviesProvider>
        <QueryClientProvider client={queryClient}>
          <MovieDashboard />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1A1B1E',
                color: '#C1C2C5',
                border: '1px solid #373A40',
              },
              success: {
                iconTheme: {
                  primary: '#51CF66',
                  secondary: '#1A1B1E',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF6B6B',
                  secondary: '#1A1B1E',
                },
              },
            }}
          />
        </QueryClientProvider>
      </RequestedMoviesProvider>
    </AuthProvider>
  )
}

export default App
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate requested movies context and toast notifications"
```

---

## Task 4: Add Quick Request Hook

**Files:**
- Create: `client/src/hooks/useQuickRequest.tsx`

**Step 1: Create the hook**

Create `client/src/hooks/useQuickRequest.tsx`:

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMovieRequest } from '../api/requests';
import { useRequestedMovies } from '../context/RequestedMoviesContext';
import type { Movie } from '../types';

export function useQuickRequest() {
  const { addRequestedMovie, isMovieRequested } = useRequestedMovies();
  const [requestingMovieId, setRequestingMovieId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (movie: Movie) => {
      return await createMovieRequest({
        title: movie.title,
        priority: 'medium',
        omdb_id: movie.id,
        notes: undefined,
      });
    },
    onSuccess: (data, movie) => {
      addRequestedMovie(movie.id);
      toast.success(`✓ ${movie.title} requested`);
      setRequestingMovieId(null);
    },
    onError: (error, movie) => {
      const message = error instanceof Error ? error.message : 'Request failed';
      toast.error(`⚠ ${message}`);
      setRequestingMovieId(null);
    },
  });

  const quickRequest = (movie: Movie) => {
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
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useQuickRequest.tsx
git commit -m "feat: add quick request hook with optimistic UI"
```

---

## Task 5: Update MovieCard Component

**Files:**
- Modify: `client/src/components/MovieCard.tsx`

**Step 1: Import dependencies**

Add to imports in `client/src/components/MovieCard.tsx`:

```tsx
import { useQuickRequest } from '../hooks/useQuickRequest';
```

**Step 2: Replace watchlist button with conditional request button**

Find the button group section (around line 93) and replace:

```tsx
// OLD CODE TO REPLACE:
      <Group mt="lg" justify="space-between" gap="sm" align="stretch" wrap="wrap">
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          disabled={!movie.available || !movie.hasVideo}
          color={movie.available && movie.hasVideo ? 'cyan' : 'gray'}
          style={{ flex: 1 }}
          onClick={() => movie.available && movie.hasVideo && onWatchClick?.(movie)}
        >
          {movie.hasVideo ? (movie.available ? 'Watch' : 'Coming Soon') : 'No Video'}
        </Button>
        {movie.available && auth.context.user && onDeleteClick && (
          <Button
            variant="light"
            color="red"
            disabled={isDeleting}
            onClick={() => !isDeleting && onDeleteClick(movie)}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        <Tooltip label="Add to watchlist" withArrow>
          <ActionIcon
            variant="light"
            color="cyan"
            size="lg"
            aria-label="Add to watchlist"
          >
            <IconBellRinging size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

// NEW CODE:
      <Group mt="lg" justify="space-between" gap="sm" align="stretch" wrap="wrap">
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          disabled={!movie.available || !movie.hasVideo}
          color={movie.available && movie.hasVideo ? 'cyan' : 'gray'}
          style={{ flex: 1 }}
          onClick={() => movie.available && movie.hasVideo && onWatchClick?.(movie)}
        >
          {movie.hasVideo ? (movie.available ? 'Watch' : 'Coming Soon') : 'No Video'}
        </Button>
        {movie.available && auth.context.user && onDeleteClick && (
          <Button
            variant="light"
            color="red"
            disabled={isDeleting}
            onClick={() => !isDeleting && onDeleteClick(movie)}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        {!movie.available && <RequestButton movie={movie} />}
      </Group>
```

**Step 3: Add RequestButton component at bottom of file**

Add before the final export:

```tsx
interface RequestButtonProps {
  movie: Movie;
}

function RequestButton({ movie }: RequestButtonProps) {
  const { quickRequest, isRequesting, isRequested } = useQuickRequest();
  const requested = isRequested(movie.id);
  const requesting = isRequesting(movie.id);

  if (requested) {
    return (
      <Button
        variant="light"
        color="grape"
        disabled
        style={{ flex: 1 }}
      >
        Requested ✓
      </Button>
    );
  }

  return (
    <Button
      variant="filled"
      color="grape"
      loading={requesting}
      onClick={() => quickRequest(movie)}
      style={{ flex: 1 }}
    >
      {requesting ? 'Requesting...' : 'Request Movie'}
    </Button>
  );
}
```

**Step 4: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/MovieCard.tsx
git commit -m "feat: replace watchlist button with quick request for unavailable movies"
```

---

## Task 6: Handle Backend API Compatibility

**Files:**
- Modify: `client/src/hooks/useQuickRequest.tsx`

**Step 1: Update mutation to handle omdb_id correctly**

The backend expects `omdb_id` to be an actual OMDb ID (like "tt1375666"), but the Movie type's `id` is the local database UUID. We need to check if the movie has an actual omdb_id field. Let's check the Movie type structure first.

Since the current Movie type doesn't expose omdb_id, we need to modify the quick request to just use the title. Update `client/src/hooks/useQuickRequest.tsx`:

```tsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMovieRequest } from '../api/requests';
import { useRequestedMovies } from '../context/RequestedMoviesContext';
import type { Movie } from '../types';

export function useQuickRequest() {
  const { addRequestedMovie, isMovieRequested } = useRequestedMovies();
  const [requestingMovieId, setRequestingMovieId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (movie: Movie) => {
      return await createMovieRequest({
        title: movie.title,
        priority: 'medium',
        notes: undefined,
        // omdb_id will be undefined - admin can link it later
      });
    },
    onSuccess: (data, movie) => {
      addRequestedMovie(movie.id);
      toast.success(`✓ ${movie.title} requested`);
      setRequestingMovieId(null);
    },
    onError: (error, movie) => {
      const message = error instanceof Error ? error.message : 'Request failed';
      toast.error(`⚠ ${message}`);
      setRequestingMovieId(null);
    },
  });

  const quickRequest = (movie: Movie) => {
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
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useQuickRequest.tsx
git commit -m "fix: remove omdb_id from quick requests (admin links later)"
```

---

## Task 7: Add Mobile Responsive Styles

**Files:**
- Modify: `client/src/components/MovieCard.tsx`

**Step 1: Update button group to stack on mobile**

Update the Group component wrapping the buttons:

```tsx
// OLD:
      <Group mt="lg" justify="space-between" gap="sm" align="stretch" wrap="wrap">

// NEW:
      <Group mt="lg" justify="space-between" gap="sm" align="stretch" style={{ flexDirection: 'column', '@media (min-width: 48em)': { flexDirection: 'row' } }}>
```

Actually, Mantine doesn't support inline media queries like that. Let's use Stack for mobile and Group for desktop:

```tsx
// Replace the entire button section with:
      <Stack mt="lg" gap="sm" hiddenFrom="sm">
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          disabled={!movie.available || !movie.hasVideo}
          color={movie.available && movie.hasVideo ? 'cyan' : 'gray'}
          fullWidth
          onClick={() => movie.available && movie.hasVideo && onWatchClick?.(movie)}
        >
          {movie.hasVideo ? (movie.available ? 'Watch' : 'Coming Soon') : 'No Video'}
        </Button>
        {movie.available && auth.context.user && onDeleteClick && (
          <Button
            variant="light"
            color="red"
            disabled={isDeleting}
            fullWidth
            onClick={() => !isDeleting && onDeleteClick(movie)}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        {!movie.available && <RequestButton movie={movie} fullWidth />}
      </Stack>

      <Group mt="lg" justify="space-between" gap="sm" align="stretch" wrap="wrap" visibleFrom="sm">
        <Button
          leftSection={<IconPlayerPlay size={16} />}
          disabled={!movie.available || !movie.hasVideo}
          color={movie.available && movie.hasVideo ? 'cyan' : 'gray'}
          style={{ flex: 1 }}
          onClick={() => movie.available && movie.hasVideo && onWatchClick?.(movie)}
        >
          {movie.hasVideo ? (movie.available ? 'Watch' : 'Coming Soon') : 'No Video'}
        </Button>
        {movie.available && auth.context.user && onDeleteClick && (
          <Button
            variant="light"
            color="red"
            disabled={isDeleting}
            onClick={() => !isDeleting && onDeleteClick(movie)}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
        {!movie.available && <RequestButton movie={movie} />}
      </Group>
```

**Step 2: Update RequestButton to accept fullWidth prop**

Update the RequestButton component:

```tsx
interface RequestButtonProps {
  movie: Movie;
  fullWidth?: boolean;
}

function RequestButton({ movie, fullWidth }: RequestButtonProps) {
  const { quickRequest, isRequesting, isRequested } = useQuickRequest();
  const requested = isRequested(movie.id);
  const requesting = isRequesting(movie.id);

  if (requested) {
    return (
      <Button
        variant="light"
        color="grape"
        disabled
        fullWidth={fullWidth}
        style={!fullWidth ? { flex: 1 } : undefined}
      >
        Requested ✓
      </Button>
    );
  }

  return (
    <Button
      variant="filled"
      color="grape"
      loading={requesting}
      onClick={() => quickRequest(movie)}
      fullWidth={fullWidth}
      style={!fullWidth ? { flex: 1 } : undefined}
    >
      {requesting ? 'Requesting...' : 'Request Movie'}
    </Button>
  );
}
```

**Step 3: Add Stack import**

Add Stack to imports:

```tsx
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Image,
  Stack,
  Text,
  Tooltip
} from '@mantine/core';
```

**Step 4: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/MovieCard.tsx
git commit -m "feat: add mobile-responsive button layout for movie cards"
```

---

## Task 8: Sync Requested State with Server on Load

**Files:**
- Modify: `client/src/context/RequestedMoviesContext.tsx`

**Step 1: Add server sync on mount**

Update `RequestedMoviesContext.tsx` to sync with server on mount:

```tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
```

**Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/context/RequestedMoviesContext.tsx
git commit -m "feat: sync requested movie state with server on mount"
```

---

## Task 9: Manual Testing

**Step 1: Start development servers**

Terminal 1 (from server directory):
```bash
npm run start:dev
```

Terminal 2 (from client directory):
```bash
npm run dev
```

**Step 2: Test quick request flow**

1. Open browser to `http://localhost:5173`
2. Log in if needed
3. Find an unavailable movie
4. Click "Request Movie" button
5. Verify:
   - Button shows "Requesting..." during request
   - Toast appears: "✓ [Movie Name] requested"
   - Button changes to "Requested ✓" (disabled)
   - Refresh page - button still shows "Requested ✓"

**Step 3: Test mobile responsiveness**

1. Open dev tools, toggle mobile view
2. Verify buttons stack vertically
3. Verify 44px touch targets (inspect element)

**Step 4: Test error handling**

1. Stop server
2. Try to request a movie
3. Verify error toast appears
4. Verify button returns to "Request Movie" state

**Step 5: Document any issues**

Create `docs/testing/phase1-manual-test-results.md` with findings.

---

## Task 10: Final Commit and Phase Summary

**Step 1: Create phase summary**

Create `docs/plans/phase1-complete.md`:

```markdown
# Phase 1: Quick Request Foundation - Complete

## Implemented Features

✅ Toast notification system (react-hot-toast)
✅ Requested movies context with localStorage persistence
✅ Quick request hook with optimistic UI
✅ Movie card inline request button
✅ Mobile-responsive button layouts
✅ Server sync on app load
✅ Request state persistence across refreshes

## Files Created

- `client/src/context/RequestedMoviesContext.tsx`
- `client/src/hooks/useQuickRequest.tsx`

## Files Modified

- `client/package.json` (added react-hot-toast)
- `client/src/App.tsx` (added providers and toast)
- `client/src/components/MovieCard.tsx` (added request button)

## Testing Notes

[Results from manual testing]

## Next Steps

Phase 2: Express Search Component
- Header quick search
- Local library + OMDb results
- Inline action buttons
```

**Step 2: Final commit**

```bash
git add docs/plans/phase1-complete.md
git commit -m "docs: add phase 1 completion summary"
```

---

## Success Criteria

- [ ] Unavailable movies show "Request Movie" button
- [ ] Clicking button triggers optimistic UI ("Requesting...")
- [ ] Toast notification confirms request
- [ ] Button changes to "Requested ✓" after success
- [ ] State persists across page refreshes
- [ ] Mobile layout stacks buttons vertically
- [ ] Touch targets are 44px minimum
- [ ] Error handling shows error toast
- [ ] Server sync works on app load

---

## Rollback Plan

If issues arise, rollback by:

1. Checkout previous branch: `git checkout chore/clean-up`
2. Delete worktree: `git worktree remove .worktrees/feature/ux-improvements`
3. Delete branch: `git branch -D feature/ux-improvements`

---

**End of Phase 1 Plan**
