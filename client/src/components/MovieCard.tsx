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
import { IconBellRinging, IconPlayerPlay } from './icons';
import type { Movie } from '../types';
import { useAuth } from '../context/AuthContext';

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
    </Card>
  );
}
