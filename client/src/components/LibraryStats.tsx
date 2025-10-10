import { Paper, Group, Stack, Text, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconMovie, IconDeviceTv, IconStars, IconClock } from './icons';
import type { Movie } from '../types';

interface BackendStats {
  total?: number;
  subTotal: number
  comingSoon?: number;
  available?: number;
  totalRuntime?: number; // minutes
  averageRating?: number; // 0-10
}

interface LibraryStatsProps {
  movies: Movie[];
  /** From pagination.subTotal (matching the current query/filter set) */
  /** From API response.stats (optional; falls back to client calc if absent/partial) */
  stats?: BackendStats | null;
}

const calculateLibraryStats = (library: Movie[]) => {
  const total = library.length;
  const available = library.filter((movie) => movie.available).length;
  const totalRuntime = library.reduce((acc, movie) => acc + (movie.duration ?? 0), 0);
  const averageRating = total
    ? Number(
      (library.reduce((acc, movie) => acc + (movie.rating ?? 0), 0) / total).toFixed(1)
    )
    : 0;

  return { total, available, totalRuntime, averageRating };
};

const formatRuntime = (minutes = 0) => {
  const mins = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours}h ${rem.toString().padStart(2, '0')}m`;
};

export function LibraryStats({ movies, stats }: LibraryStatsProps) {
  // Fallback to client-side stats if API didn't send some/all fields


  const local = calculateLibraryStats(movies);
  const merged = {
    total: stats?.total,
    available: stats?.total,
    comingSoon: stats?.comingSoon,
    totalRuntime: stats?.totalRuntime,
    averageRating:
      typeof stats?.averageRating === 'number' ? Number(stats!.averageRating.toFixed(1)) : local.averageRating,
  };

  // If subTotal exists, show it as the primary "Total movies" count,
  // and clarify the full-library total in the description.

  const subTotal = movies.length
  const totalPrimary = typeof subTotal === 'number' ? subTotal : merged.total;
  const totalDescription =
    typeof subTotal === 'number' && subTotal !== merged.total
      ? `of ${merged.total} total`
      : 'In your library';

  const statItems = [
    {
      label: 'Total movies',
      value: totalPrimary,
      icon: <IconMovie size={18} />,
      description: totalDescription,
    },
    {
      label: 'Available',
      value: merged.available,
      icon: <IconDeviceTv size={18} />,
      description: `${merged.comingSoon} coming soon`,
    },
    {
      label: 'Avg rating',
      value: merged.averageRating ? `${merged.averageRating}/10` : '—',
      icon: <IconStars size={18} />,
      description: 'IMDb ratings',
    },
    {
      label: 'Total runtime',
      value: merged.totalRuntime ? formatRuntime(merged.totalRuntime) : '—',
      icon: <IconClock size={18} />,
      description: 'Hours of content',
    },
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

