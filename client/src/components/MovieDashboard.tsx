import { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Container,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowsSort,
  IconBellPlus,
  IconClock,
  IconDeviceTv,
  IconDownload,
  IconFilter,
  IconListCheck,
  IconMovie,
  IconSearch,
  IconStars
} from './icons';
import type { Movie, MovieRequest, SearchFilters } from '../types';
import { MovieCard } from './MovieCard';
import { MovieRequestForm } from './MovieRequestForm';

type ExtendedMovieRequest = MovieRequest & {
  id: string;
  submittedAt: string;
  status: 'queued' | 'processing' | 'completed';
};

const SAMPLE_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'The Matrix',
    description:
      'A computer programmer discovers that reality as he knows it might not be real after all.',
    year: 1999,
    genre: ['Action', 'Sci-Fi'],
    rating: 8.7,
    duration: 136,
    director: 'Lana Wachowski, Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    available: true,
    poster: 'https://images.unsplash.com/photo-1581905764498-7e3cf82262cc?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '2',
    title: 'Inception',
    description:
      'A thief who steals corporate secrets through dream-sharing technology is given the inverse task.',
    year: 2010,
    genre: ['Action', 'Sci-Fi', 'Thriller'],
    rating: 8.8,
    duration: 148,
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    available: true,
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '3',
    title: 'Dune: Part Two',
    description:
      'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators.',
    year: 2024,
    genre: ['Action', 'Adventure', 'Drama'],
    rating: 8.9,
    duration: 166,
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    available: false,
    poster: 'https://images.unsplash.com/photo-1502139214982-d0ad755818d8?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '4',
    title: 'Spider-Man: Across the Spider-Verse',
    description:
      'After reuniting with Gwen Stacy, Brooklyn’s friendly neighborhood Spider-Man finds himself transported into the Multiverse.',
    year: 2023,
    genre: ['Animation', 'Action', 'Adventure'],
    rating: 9.1,
    duration: 140,
    director: 'Joaquim Dos Santos, Kemp Powers, Justin K. Thompson',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac'],
    available: true,
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80'
  }
];

const SAMPLE_REQUESTS: ExtendedMovieRequest[] = [
  {
    id: 'rq-1',
    title: 'Inside Out 2',
    requestedBy: 'Avery',
    priority: 'high',
    description: 'Great for our next family movie night with the kids.',
    submittedAt: '2 days ago',
    status: 'queued'
  },
  {
    id: 'rq-2',
    title: 'Top Gun: Maverick',
    requestedBy: 'Chris',
    priority: 'medium',
    description: 'Would love to watch the aerial sequences in 4K.',
    submittedAt: '1 week ago',
    status: 'processing'
  },
  {
    id: 'rq-3',
    title: 'Pride & Prejudice',
    requestedBy: 'Morgan',
    priority: 'low',
    description: 'Adding to the comfort rewatches list.',
    submittedAt: '3 weeks ago',
    status: 'completed'
  }
];

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Documentary',
  'Drama',
  'Family',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller'
];

const fetchMovieLibrary = async (): Promise<Movie[]> => {
  await new Promise((resolve) => setTimeout(resolve, 280));
  return SAMPLE_MOVIES;
};

const fetchRequestQueue = async (): Promise<ExtendedMovieRequest[]> => {
  await new Promise((resolve) => setTimeout(resolve, 180));
  return SAMPLE_REQUESTS;
};

const calculateLibraryStats = (library: Movie[]) => {
  const total = library.length;
  const available = library.filter((movie) => movie.available).length;
  const upcoming = total - available;
  const totalRuntime = library.reduce((acc, movie) => acc + movie.duration, 0);
  const averageRating = total
    ? Number((library.reduce((acc, movie) => acc + movie.rating, 0) / total).toFixed(1))
    : 0;

  return {
    total,
    available,
    upcoming,
    totalRuntime,
    averageRating
  };
};

const formatRuntime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
};

export function MovieDashboard() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [requests, setRequests] = useState<ExtendedMovieRequest[]>([]);
  const [stats, setStats] = useState(() => calculateLibraryStats([]));
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    genre: undefined,
    year: undefined,
    rating: undefined,
    available: undefined
  });
  const [availability, setAvailability] = useState<'all' | 'available' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'rating' | 'year'>('featured');
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestModalOpened, { open: openRequestModal, close: closeRequestModal }] =
    useDisclosure(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingLibrary(true);
      const library = await fetchMovieLibrary();
      if (cancelled) return;

      setMovies(library);
      setStats(calculateLibraryStats(library));
      setLoadingLibrary(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRequests = async () => {
      setLoadingRequests(true);
      const queue = await fetchRequestQueue();
      if (cancelled) return;
      setRequests(queue);
      setLoadingRequests(false);
    };

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      available: availability === 'all' ? undefined : availability === 'available'
    }));
  }, [availability]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      if (filters.query && !movie.title.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      if (filters.genre && !movie.genre.includes(filters.genre)) {
        return false;
      }
      if (filters.year && movie.year !== filters.year) {
        return false;
      }
      if (filters.rating && movie.rating < filters.rating) {
        return false;
      }
      if (filters.available !== undefined && movie.available !== filters.available) {
        return false;
      }
      return true;
    });
  }, [movies, filters]);

  const sortedMovies = useMemo(() => {
    const moviesToSort = [...filteredMovies];
    switch (sortBy) {
      case 'rating':
        moviesToSort.sort((a, b) => b.rating - a.rating);
        break;
      case 'year':
        moviesToSort.sort((a, b) => b.year - a.year);
        break;
      default:
        moviesToSort.sort((a, b) => {
          if (a.available === b.available) {
            return b.rating - a.rating;
          }
          return a.available ? -1 : 1;
        });
    }
    return moviesToSort;
  }, [filteredMovies, sortBy]);

  const featuredMovie = useMemo(() => {
    if (!movies.length) return undefined;
    return movies.reduce((top, current) => (current.rating > (top?.rating ?? 0) ? current : top), movies[0]);
  }, [movies]);

  const handleMovieRequest = (request: MovieRequest) => {
    console.log('Movie request submitted:', request);
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

  const requestStatusColor = (status: ExtendedMovieRequest['status']) => {
    switch (status) {
      case 'completed':
        return 'teal';
      case 'processing':
        return 'grape';
      default:
        return 'cyan';
    }
  };

  const requestStatusIcon = (status: ExtendedMovieRequest['status']) => {
    switch (status) {
      case 'completed':
        return <IconListCheck size={14} />;
      case 'processing':
        return <IconDownload size={14} />;
      default:
        return <IconClock size={14} />;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper radius="lg" p={{ base: 'lg', md: 'xl' }} className="movie-dashboard-hero">
          <Stack gap="lg">
            <Badge
              variant="light"
              color="cyan"
              size="lg"
              maw={220}
              leftSection={<IconDeviceTv size={16} />}
            >
              Local streaming hub
            </Badge>

            <Group align="flex-start" justify="space-between" wrap="wrap" gap="xl">
              <Stack gap="xs" flex={1} miw={260}>
                <Title order={1} fz={{ base: 32, sm: 40 }}>
                  Your family cinema, beautifully organized
                </Title>
                <Text size="lg" c="dimmed" maw={520}>
                  Stream your favorites instantly, keep track of the collection, and queue new
                  additions without leaving the sofa.
                </Text>
                <Group>
                  <Button leftSection={<IconMovie size={16} />} size="md">
                    Browse library
                  </Button>
                  <Button
                    variant="light"
                    color="grape"
                    leftSection={<IconBellPlus size={16} />}
                    size="md"
                    onClick={openRequestModal}
                  >
                    Request a movie
                  </Button>
                </Group>
              </Stack>

              {featuredMovie && (
                <Paper
                  radius="lg"
                  withBorder
                  p="lg"
                  maw={320}
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15, 118, 110, 0.15), rgba(8, 47, 73, 0.45))'
                  }}
                >
                  <Stack gap="sm">
                    <Group gap="xs">
                      <ThemeIcon color="teal" variant="light" size="lg">
                        <IconStars size={18} />
                      </ThemeIcon>
                      <Text fw={600} size="sm" tt="uppercase" c="teal.2">
                        Featured tonight
                      </Text>
                    </Group>
                    <Text fw={600}>{featuredMovie.title}</Text>
                    <Text size="sm" c="dimmed" lineClamp={2}>
                      {featuredMovie.description}
                    </Text>
                    <Group gap="xs" wrap="wrap">
                      <Badge variant="light" color="cyan">
                        {featuredMovie.rating}/10 IMDb
                      </Badge>
                      <Badge variant="light" color="teal">
                        {featuredMovie.duration} minutes
                      </Badge>
                    </Group>
                  </Stack>
                </Paper>
              )}
            </Group>
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          {[
            {
              label: 'Total titles',
              value: stats.total,
              icon: <IconMovie size={18} />,
              description: 'Across all genres'
            },
            {
              label: 'Available now',
              value: stats.available,
              icon: <IconDeviceTv size={18} />,
              description: `${stats.upcoming} coming soon`
            },
            {
              label: 'Average rating',
              value: stats.averageRating ? `${stats.averageRating}/10` : '—',
              icon: <IconStars size={18} />,
              description: 'Based on stored titles'
            },
            {
              label: 'Total runtime',
              value: stats.totalRuntime ? formatRuntime(stats.totalRuntime) : '—',
              icon: <IconClock size={18} />,
              description: 'Binge hours available'
            }
          ].map((item) => (
            <Paper key={item.label} withBorder radius="lg" p="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {item.label}
                  </Text>
                  <Text fz={32} fw={700}>
                    {item.value}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {item.description}
                  </Text>
                </Stack>
                <ThemeIcon size="lg" radius="md" variant="light" color="cyan">
                  {item.icon}
                </ThemeIcon>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>

        <Grid gutter={{ base: 'lg', md: 'xl' }}>
          <Grid.Col span={{ base: 12, lg: 9 }}>
            <Paper withBorder radius="lg" p="lg">
              <Stack gap="lg">
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap={4}>
                    <Title order={2} size="h3">
                      Library explorer
                    </Title>
                    <Text size="sm" c="dimmed">
                      Filter, sort, and dive into everything that is ready to stream.
                    </Text>
                  </Stack>

                  <Group gap="sm">
                    <SegmentedControl
                      value={availability}
                      onChange={(value) =>
                        setAvailability((value as 'all' | 'available' | 'upcoming') ?? 'all')
                      }
                      data={[
                        { label: 'All titles', value: 'all' },
                        { label: 'Available', value: 'available' },
                        { label: 'Coming soon', value: 'upcoming' }
                      ]}
                    />

                    <Select
                      value={sortBy}
                      onChange={(value) => setSortBy((value as typeof sortBy) ?? 'featured')}
                      data={[
                        { value: 'featured', label: 'Curated order' },
                        { value: 'rating', label: 'Rating (high → low)' },
                        { value: 'year', label: 'Newest releases' }
                      ]}
                      leftSection={<IconArrowsSort size={16} />}
                      maw={210}
                    />
                  </Group>
                </Group>

                <Divider />

                <Grid gutter={{ base: 'md', md: 'lg' }}>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      placeholder="Search movies..."
                      value={filters.query}
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, query: event.currentTarget.value }))
                      }
                      leftSection={<IconSearch size={16} />}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Select
                      placeholder="Select genre"
                      value={filters.genre}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, genre: value || undefined }))
                      }
                      data={GENRES}
                      searchable
                      clearable
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <NumberInput
                      placeholder="Release year"
                      value={filters.year}
                      onChange={(value) =>
                        setFilters((prev) => ({ ...prev, year: (value as number) || undefined }))
                      }
                      min={1960}
                      max={new Date().getFullYear() + 2}
                    />
                  </Grid.Col>
                </Grid>

                <Group align="center" gap="md" wrap="wrap">
                  <NumberInput
                    label="Minimum rating"
                    value={filters.rating}
                    onChange={(value) =>
                      setFilters((prev) => ({ ...prev, rating: (value as number) || undefined }))
                    }
                    min={0}
                    max={10}
                    step={0.1}
                    decimalScale={1}
                    w={180}
                  />
                  <Switch
                    label="Hide unavailable"
                    checked={filters.available === true}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        available: event.currentTarget.checked ? true : undefined
                      }))
                    }
                  />
                  <Tooltip label="Reset all filters">
                    <Button variant="light" color="gray" leftSection={<IconFilter size={16} />} onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </Tooltip>
                </Group>

                <Divider />

                <Group justify="space-between" align="center">
                  <Text size="sm" c="dimmed">
                    {sortedMovies.length} {sortedMovies.length === 1 ? 'title' : 'titles'} match your filters
                  </Text>
                  <Anchor href="#" c="cyan.3" size="sm" onClick={(event) => event.preventDefault()}>
                    View download queue
                  </Anchor>
                </Group>

                {loadingLibrary ? (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} height={360} radius="lg" />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Grid gutter={{ base: 'lg', md: 'xl' }}>
                    {sortedMovies.map((movie) => (
                      <Grid.Col key={movie.id} span={{ base: 12, sm: 6, md: 4 }}>
                        <MovieCard movie={movie} />
                      </Grid.Col>
                    ))}
                  </Grid>
                )}

                {!loadingLibrary && sortedMovies.length === 0 && (
                  <Paper radius="lg" withBorder p="xl" ta="center">
                    <Stack gap="sm">
                      <ThemeIcon size="xl" radius="lg" variant="light" color="cyan">
                        <IconSearch size={24} />
                      </ThemeIcon>
                      <Title order={4}>No matches yet</Title>
                      <Text size="sm" c="dimmed">
                        Try broadening your filters or clearing them to view the full library.
                      </Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 3 }}>
            <Stack gap="lg">
              <Paper withBorder radius="lg" p="lg" className="side-panel">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
                        Request queue
                      </Text>
                      <Title order={4}>
                        Family picks
                      </Title>
                    </div>
                    <Badge color="cyan" variant="light">
                      {requests.length}
                    </Badge>
                  </Group>

                  <Text size="sm" c="dimmed">
                    Every request is stored for review. Mark titles as completed once they are added to
                    the library.
                  </Text>

                  <Divider my="xs" color="rgba(148, 163, 184, 0.2)" />

                  {loadingRequests ? (
                    <Stack gap="sm">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} height={80} radius="md" />
                      ))}
                    </Stack>
                  ) : (
                    <Timeline
                      active={requests.findIndex((request) => request.status === 'queued')}
                      bulletSize={20}
                      lineWidth={2}
                      color="cyan"
                    >
                      {requests.map((request) => (
                        <Timeline.Item
                          key={request.id}
                          bullet={
                            <ThemeIcon size={20} radius="xl" variant="light" color={requestStatusColor(request.status)}>
                              {requestStatusIcon(request.status)}
                            </ThemeIcon>
                          }
                          title={request.title}
                        >
                          <Text size="sm" fw={500}>
                            Requested by {request.requestedBy}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {request.description}
                          </Text>
                          <Group gap="xs" mt={6} wrap="wrap">
                            <Badge color={requestStatusColor(request.status)} variant="light">
                              {request.status === 'queued'
                                ? 'Queued'
                                : request.status === 'processing'
                                  ? 'Processing'
                                  : 'Completed'}
                            </Badge>
                            <Badge color={request.priority === 'high' ? 'red' : request.priority === 'medium' ? 'yellow' : 'gray'} variant="light">
                              {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} priority
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {request.submittedAt}
                            </Text>
                          </Group>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  )}

                  <Button
                    variant="light"
                    color="cyan"
                    fullWidth
                    leftSection={<IconBellPlus size={16} />}
                    onClick={openRequestModal}
                  >
                    Add a new request
                  </Button>
                </Stack>
              </Paper>

              <Paper withBorder radius="lg" p="lg">
                <Stack gap="sm">
                  <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
                    Quick links
                  </Text>
                  <Stack gap={6}>
                    {[
                      'Recently added titles',
                      'Watch together playlist',
                      '4K remasters to grab next',
                      'Kids-friendly picks'
                    ].map((link) => (
                      <Anchor
                        key={link}
                        href="#"
                        c="cyan.3"
                        size="sm"
                        onClick={(event) => event.preventDefault()}
                      >
                        {link}
                      </Anchor>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
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
