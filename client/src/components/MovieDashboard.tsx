import { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBellPlus } from './icons';
import type { Movie, MovieRequest, SearchFilters } from '../types';
import { MovieCard } from './MovieCard';
import { MovieRequestForm } from './MovieRequestForm';
import { LibraryStats } from './LibraryStats';
import { MovieFilters } from './MovieFilters';
import { RequestQueue } from './RequestQueue';
import { MovieWatchPage } from './MovieWatchPage';
import { getMovieLibrary } from '../api/movies';
import { getMovieRequests, addMovieRequest, type ExtendedMovieRequest } from '../api/requests';
import { useMovies, useMovieLibrary } from '../hooks/useMovies';
import { useDebounce } from 'use-debounce';


export function MovieDashboard() {
  const [requests, setRequests] = useState<ExtendedMovieRequest[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    genre: undefined,
    year: undefined,
    rating: undefined,
    available: undefined
  });
  const [debouncedQuery] = useDebounce(filters.query, 1000);
  const [availability, setAvailability] = useState<'all' | 'available' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'year'>('featured');
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);


  const [requestModalOpened, { open: openRequestModal, close: closeRequestModal }] =
    useDisclosure(false);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      available: availability === 'all' ? undefined : availability === 'available'
    }));
  }, [availability]);

  const { movies, isLoading: loadingLibrary, error } = useMovieLibrary({
    filters,
    debouncedQuery,
    sortBy,
  });

  const handleMovieRequest = async (request: MovieRequest) => {
    const newRequest = await addMovieRequest(request);
    setRequests(prev => [newRequest, ...prev]);
  };

  const handleWatchMovie = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handleBackToLibrary = () => {
    setSelectedMovie(null);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      genre: undefined,
      year: undefined,
      rating: undefined,
      available: availability === 'all' ? undefined : availability === 'available'
    });
  };

  if (selectedMovie) {
    return (
      <MovieWatchPage
        movie={selectedMovie}
        onBack={handleBackToLibrary}
      />
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper radius="lg" p={{ base: 'lg', md: 'xl' }}>
          Testicle
          <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
              <Stack gap="xs">
                <Title order={1} fz={{ base: 24, sm: 32 }}>
                  Home Movie Library
                </Title>
                <Text size="lg" c="dimmed">
                  Stream your collection and request new movies for the household.
                </Text>
              </Stack>
              <Button
                leftSection={<IconBellPlus size={16} />}
                onClick={openRequestModal}
              >
                Request Movie
              </Button>
            </Group>
          </Stack>
        </Paper>

        <LibraryStats movies={movies} />

        <Grid gutter={{ base: 'lg', md: 'xl' }}>
          <Grid.Col span={{ base: 12, lg: 9 }}>
            <Paper withBorder radius="lg" p="lg">
              <Stack gap="lg">
                <Group justify="space-between" align="center">
                  <Stack gap={4}>
                    <Title order={2} size="h3">
                      Movie Library
                    </Title>
                    <Text size="sm" c="dimmed">
                      Browse and filter your movie collection.
                    </Text>
                  </Stack>
                </Group>

                <MovieFilters
                  filters={filters}
                  setFilters={setFilters}
                  availability={availability}
                  setAvailability={setAvailability}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  onClearFilters={clearFilters}
                />

                <Text size="sm" c="dimmed">
                  {movies.length} {movies.length === 1 ? 'movie' : 'movies'} found
                </Text>

                {(loadingLibrary) ? (
                  <Grid gutter="lg">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
                        <Skeleton height={360} radius="lg" />
                      </Grid.Col>
                    ))}
                  </Grid>
                ) : (
                  <Grid gutter="lg">
                    {movies.map((movie) => (
                      <Grid.Col key={movie.id} span={{ base: 12, sm: 6, md: 4 }}>
                        <MovieCard movie={movie} onWatchClick={handleWatchMovie} />
                      </Grid.Col>
                    ))}
                  </Grid>
                )}

                {error && (
                  <Paper radius="lg" withBorder p="xl" ta="center">
                    <Stack gap="sm">
                      <Text fw={600} c="red">Search Error</Text>
                      <Text size="sm" c="dimmed">
                        {error instanceof Error ? error.message : 'Failed to search movies. Please try again.'}
                      </Text>
                    </Stack>
                  </Paper>
                )}

                {!loadingLibrary && movies.length === 0 && !error && (
                  <Paper radius="lg" withBorder p="xl" ta="center">
                    <Stack gap="sm">
                      <Text fw={600}>No movies found</Text>
                      <Text size="sm" c="dimmed">
                        {debouncedQuery && debouncedQuery.length >= 2
                          ? 'No movies found for your search. Try a different title.'
                          : 'Try adjusting your search filters.'
                        }
                      </Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 3 }}>
            <RequestQueue
              requests={requests}
              loading={loadingRequests}
              onOpenRequestModal={openRequestModal}
            />
          </Grid.Col>
        </Grid>
      </Stack>

      <MovieRequestForm
        opened={requestModalOpened}
        onClose={closeRequestModal}
        onSubmit={handleMovieRequest}
      />
    </Container>
  );
}
