import { Paper, Group, Stack, Text, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconMovie, IconDeviceTv, IconStars, IconClock } from './icons';
import type { Movie } from '../types';

interface LibraryStatsProps {
  movies: Movie[];
}

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

export function LibraryStats({ movies }: LibraryStatsProps) {
  const stats = calculateLibraryStats(movies);

  const statItems = [
    {
      label: 'Total movies',
      value: stats.total,
      icon: <IconMovie size={18} />,
      description: 'In your library'
    },
    {
      label: 'Available',
      value: stats.available,
      icon: <IconDeviceTv size={18} />,
      description: `${stats.upcoming} coming soon`
    },
    {
      label: 'Avg rating',
      value: stats.averageRating ? `${stats.averageRating}/10` : '—',
      icon: <IconStars size={18} />,
      description: 'IMDb ratings'
    },
    {
      label: 'Total runtime',
      value: stats.totalRuntime ? formatRuntime(stats.totalRuntime) : '—',
      icon: <IconClock size={18} />,
      description: 'Hours of content'
    }
  ];

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
      {statItems.map((item) => (
        <Paper key={item.label} withBorder radius="lg" p="lg">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                {item.label}
              </Text>
              <Text fz={24} fw={700}>
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
  );
}