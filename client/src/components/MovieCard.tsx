import { Card, Image, Text, Badge, Button, Group, Stack } from '@mantine/core';
import type { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={movie.poster || 'https://via.placeholder.com/300x450?text=No+Poster'}
          height={300}
          alt={movie.title}
        />
      </Card.Section>

      <Stack mt="md" mb="xs">
        <Text fw={500} size="lg">
          {movie.title} ({movie.year})
        </Text>

        <Group gap="xs">
          {movie.genre.map((g) => (
            <Badge key={g} variant="light" size="sm">
              {g}
            </Badge>
          ))}
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Rating: {movie.rating}/10
          </Text>
          <Badge color={movie.available ? 'green' : 'red'} variant="filled">
            {movie.available ? 'Available' : 'Coming Soon'}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed" lineClamp={3}>
          {movie.description}
        </Text>

        <Text size="xs" c="dimmed">
          Director: {movie.director} • {movie.duration} min
        </Text>
      </Stack>

      <Button
        variant="light"
        fullWidth
        mt="md"
        radius="md"
        disabled={!movie.available}
      >
        {movie.available ? 'Watch Now' : 'Notify When Available'}
      </Button>
    </Card>
  );
}