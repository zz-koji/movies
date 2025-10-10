import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { IconBellPlus } from './icons';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { MovieRequestForm } from './MovieRequestForm';
import { LibraryStats } from './LibraryStats';
import { MovieFilters } from './MovieFilters';
import { RequestQueue } from './RequestQueue';
import { MovieWatchPage } from './MovieWatchPage';
import { useMovieLibrary } from '../hooks/useMovies';
import { useDebounce } from 'use-debounce';
import { LoginModal } from './auth/LoginModal';
import { useAuth } from '../context/AuthContext';
import { IconInfoCircle, IconLogin } from '@tabler/icons-react';
import { MovieUploadSection } from './MovieUploadSection';
import { deleteMovieFromLibrary } from '../api/movies';
import { useMovieRequests } from '../hooks/useMovieRequest';
import { useMovieFilters } from '../hooks/useMovieFilters';



export function MovieDashboard() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [deletingMovieId, setDeletingMovieId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const loadingRequests = false;

  const { movieRequests, handleMovieRequest, movieRequestModal: { closeMovieRequestModal, movieRequestModalOpened, openMovieRequestModal } } = useMovieRequests();
  const handleWatchMovie = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const { availability, filters, sortBy, setSortBy, handlers } = useMovieFilters()

  const { handleLogin, openLoginModal, loginModalOpened, closeLoginModal, context } = useAuth();

  const [debouncedQuery] = useDebounce(filters.query, 500);

  const {
    movies,
    isLoading: loadingLibrary,
    error,
    reloadLocalLibrary,
    loadMoreLocalMovies,
    hasMoreLocalMovies,
    isLoadingMoreLocalMovies,
    isSearching,
    stats,
  } = useMovieLibrary({
    filters,
    debouncedQuery,
    sortBy,
  });

  const handleBackToLibrary = () => {
    setSelectedMovie(null);
  };

  const handleDeleteMovie = async (movie: Movie) => {
    setDeleteError(null);
    setDeletingMovieId(movie.id);

    try {
      await deleteMovieFromLibrary(movie.id);
      await reloadLocalLibrary();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to delete the movie. Please try again.';
      setDeleteError(message);
    } finally {
      setDeletingMovieId(null);
    }
  };

  if (selectedMovie) {
    return (
      <MovieWatchPage
        movie={selectedMovie}
        onBack={handleBackToLibrary}
      />
    );
  }

  const resultLabel = `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} found`;
  const showLoadMore = hasMoreLocalMovies && !error;
  const showEmptyState = !loadingLibrary && movies.length === 0 && !error;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <DashboardHeader
          isAuthenticated={Boolean(context.user)}
          onLogin={openLoginModal}
          onRequestMovie={openMovieRequestModal}
        />

        <LibraryStats movies={movies} stats={stats} />

        <Paper withBorder radius="lg" p={{ base: 'lg', md: 'xl' }}>
          <Stack gap="lg">
            <SectionHeading
              title="Movie Library"
              description="Browse, filter, and manage your collection."
            />

            <MovieFilters
              filters={filters}
              onFiltersChange={handlers.handleFiltersChange}
              availability={availability}
              onAvailabilityChange={handlers.handleAvailabilityChange}
              sortBy={sortBy}
              onSortChange={(value) => setSortBy(value)}
              onClearFilters={handlers.handleClearFilters}
            />

            <Text size="sm" c="dimmed">
              {resultLabel}
            </Text>

            {deleteError && (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                {deleteError}
              </Alert>
            )}

            <MovieGrid
              movies={movies}
              isLoading={loadingLibrary}
              onSelectMovie={handleWatchMovie}
              onDeleteMovie={(movie) => {
                void handleDeleteMovie(movie);
              }}
              deletingMovieId={deletingMovieId}
            />

            {showLoadMore && (
              <Group justify="center">
                <Button
                  variant="light"
                  onClick={() => { void loadMoreLocalMovies(); }}
                  loading={isLoadingMoreLocalMovies}
                >
                  Load More
                </Button>
              </Group>
            )}

            {error && (
              <StatusMessage
                title={isSearching ? 'Search Error' : 'Library Error'}
                description={error instanceof Error
                  ? error.message
                  : isSearching
                    ? 'Failed to search movies. Please try again.'
                    : 'Failed to load the local library. Please try again.'}
              />
            )}

            {showEmptyState && (
              <StatusMessage
                title="No movies found"
                description={debouncedQuery && debouncedQuery.length >= 2
                  ? 'No movies matched your search. Try another title.'
                  : 'Adjust your search or filters to discover more movies.'}
              />
            )}
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <RequestQueue
            requests={movieRequests}
            loading={loadingRequests}
            onOpenRequestModal={openMovieRequestModal}
          />

          <MovieUploadSection
            isAuthenticated={Boolean(context.user)}
            onRequestLogin={openLoginModal}
            onUploadSuccess={reloadLocalLibrary}
          />
        </SimpleGrid>
      </Stack>

      <LoginModal
        opened={loginModalOpened}
        onClose={closeLoginModal}
        onSubmit={handleLogin}
      />

      <MovieRequestForm
        opened={movieRequestModalOpened}
        onClose={closeMovieRequestModal}
        onSubmit={handleMovieRequest}
      />
    </Container>
  );
}

interface DashboardHeaderProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onRequestMovie: () => void;
}

function DashboardHeader({ isAuthenticated, onLogin, onRequestMovie }: DashboardHeaderProps) {
  return (
    <Paper radius="lg" p={{ base: 'lg', md: 'xl' }}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap="xs">
          <Title order={1} fz={{ base: 24, sm: 32 }}>
            Home Movie Library
          </Title>
          <Text size="lg" c="dimmed">
            Stream your collection, request new movies, and keep everyone in the loop.
          </Text>
        </Stack>

        <Button
          leftSection={isAuthenticated ? <IconBellPlus size={16} /> : <IconLogin size={16} />}
          onClick={isAuthenticated ? onRequestMovie : onLogin}
        >
          {isAuthenticated ? 'Request Movie' : 'Login'}
        </Button>
      </Group>
    </Paper>
  );
}

interface SectionHeadingProps {
  title: string;
  description: string;
}

function SectionHeading({ title, description }: SectionHeadingProps) {
  return (
    <Stack gap={4}>
      <Title order={2} size="h3">
        {title}
      </Title>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Stack>
  );
}

interface MovieGridProps {
  movies: Movie[];
  isLoading: boolean;
  onSelectMovie: (movie: Movie) => void;
  onDeleteMovie?: (movie: Movie) => void;
  deletingMovieId: string | null;
}

function MovieGrid({
  movies,
  isLoading,
  onSelectMovie,
  onDeleteMovie,
  deletingMovieId,
}: MovieGridProps) {
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} height={360} radius="lg" />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onWatchClick={onSelectMovie}
          onDeleteClick={movie.available ? onDeleteMovie : undefined}
          isDeleting={deletingMovieId === movie.id}
        />
      ))}
    </SimpleGrid>
  );
}

interface StatusMessageProps {
  title: string;
  description: string;
}

function StatusMessage({ title, description }: StatusMessageProps) {
  return (
    <Paper radius="lg" withBorder p="xl" ta="center">
      <Stack gap="sm">
        <Text fw={600}>{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Paper>
  );
}
