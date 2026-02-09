import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Image,
  Stack,
  Text
} from '@mantine/core';
import { IconPlayerPlay } from './icons';
import type { Movie } from '../types';
import { useAuth } from '../context/AuthContext';
import { useQuickRequest } from '../hooks/useQuickRequest';

interface MovieCardProps {
  movie: Movie;
  onWatchClick?: (movie: Movie) => void;
  onDeleteClick?: (movie: Movie) => void;
  isDeleting?: boolean;
}

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=600&q=80';

export function MovieCard({ movie, onWatchClick, onDeleteClick, isDeleting = false }: MovieCardProps) {
  const topCast = movie.cast.slice(0, 3).join(', ');
  const auth = useAuth();

  return (
    <Card withBorder radius="lg" p="lg" shadow="sm" style={{ height: '100%' }}>
      <Card.Section inheritPadding pb="xs">
        <div
          className="movie-card-poster"
          style={{ position: 'relative', borderRadius: 'var(--mantine-radius-lg)' }}
        >
          <Image
            src={movie.poster || FALLBACK_POSTER}
            height={240}
            alt={movie.title}
            radius="lg"
            fallbackSrc={FALLBACK_POSTER}
            style={{ borderRadius: 'inherit', objectFit: 'cover' }}
          />
          <Group
            justify="space-between"
            px="md"
            py="sm"
            align="flex-start"
            style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          >
            <Badge color="yellow" variant="light">
              ⭐ {movie.rating.toFixed(1)} / 10
            </Badge>
            <Badge color={movie.available ? 'teal' : 'grape'} variant="filled">
              {movie.available ? 'Available' : 'Coming soon'}
            </Badge>
          </Group>

        </div>
      </Card.Section>

      <Stack gap="sm" mt="lg" style={{ flex: 1 }}>
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text fw={600} size="lg">
              {movie.title}
            </Text>
            <Text size="xs" c="dimmed">
              {movie.year} • {movie.duration} min • {movie.director}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs">
          {movie.genre.map((genre) => (
            <Badge key={genre} variant="light" color="cyan" size="sm">
              {genre}
            </Badge>
          ))}
        </Group>

        <Text size="sm" c="dimmed" lineClamp={3}>
          {movie.description}
        </Text>

        <Divider my="xs" color="rgba(148, 163, 184, 0.3)" />

        <Text size="xs" c="dimmed">
          Starring: {topCast}
        </Text>
      </Stack>

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
    </Card>
  );
}

interface RequestButtonProps {
  movie: Movie;
  fullWidth?: boolean;
}

function RequestButton({ movie, fullWidth }: RequestButtonProps) {
  const { quickRequest, isRequesting, isRequested } = useQuickRequest();
  const requested = isRequested(movie.id) || movie.requested;
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
