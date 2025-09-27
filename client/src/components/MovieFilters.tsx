import { Grid, TextInput, Select, Button, Group, SegmentedControl } from '@mantine/core';
import { IconSearch, IconFilter, IconArrowsSort } from './icons';
import type { SearchFilters } from '../types';

interface MovieFiltersProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  availability: 'all' | 'available' | 'upcoming';
  setAvailability: (value: 'all' | 'available' | 'upcoming') => void;
  sortBy: 'featured' | 'rating' | 'year';
  setSortBy: (value: 'featured' | 'rating' | 'year') => void;
  onClearFilters: () => void;
}

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Drama',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Thriller'
];

export function MovieFilters({
  filters,
  setFilters,
  availability,
  setAvailability,
  sortBy,
  setSortBy,
  onClearFilters
}: MovieFiltersProps) {
  return (
    <Grid gutter="md">
      <Grid.Col span={12}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <SegmentedControl
            value={availability}
            onChange={setAvailability}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Available', value: 'available' },
              { label: 'Coming soon', value: 'upcoming' }
            ]}
          />
          <Select
            value={sortBy}
            onChange={(value) => setSortBy((value as typeof sortBy) ?? 'featured')}
            data={[
              { value: 'featured', label: 'Featured' },
              { value: 'rating', label: 'Rating' },
              { value: 'year', label: 'Year' }
            ]}
            leftSection={<IconArrowsSort size={16} />}
            w={160}
          />
        </Group>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 6 }}>
        <TextInput
          placeholder="Search movies..."
          value={filters.query}
          onChange={(event) =>
            setFilters({ ...filters, query: event.currentTarget.value })
          }
          leftSection={<IconSearch size={16} />}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <Select
          placeholder="Genre"
          value={filters.genre}
          onChange={(value) =>
            setFilters({ ...filters, genre: value || undefined })
          }
          data={GENRES}
          clearable
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <Button
          variant="light"
          color="gray"
          leftSection={<IconFilter size={16} />}
          onClick={onClearFilters}
          fullWidth
        >
          Clear
        </Button>
      </Grid.Col>
    </Grid>
  );
}