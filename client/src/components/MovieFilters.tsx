import { Grid, TextInput, Select, Button, Group, SegmentedControl } from '@mantine/core';
import { IconSearch, IconFilter, IconArrowsSort } from './icons';
import type { SearchFilters } from '../types';

interface MovieFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availability: 'all' | 'available' | 'upcoming';
  onAvailabilityChange: (value: 'all' | 'available' | 'upcoming') => void;
  sortBy: 'title' | 'rating' | 'year';
  onSortChange: (value: 'title' | 'rating' | 'year') => void;
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
  onFiltersChange,
  availability,
  onAvailabilityChange,
  sortBy,
  onSortChange,
  onClearFilters
}: MovieFiltersProps) {
  const updateFilters = (patch: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Grid gutter="md">
      <Grid.Col span={12}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <SegmentedControl
            value={availability}
            onChange={(value) => onAvailabilityChange(value as 'all' | 'available' | 'upcoming')}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Available', value: 'available' },
              { label: 'Coming soon', value: 'upcoming' }
            ]}
          />
          <Select
            value={sortBy}
            onChange={(value) => onSortChange((value ?? 'title') as 'title' | 'rating' | 'year')}
            data={[
              { value: 'title', label: 'Title' },
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
          onChange={(event) => updateFilters({ query: event.currentTarget.value })}
          leftSection={<IconSearch size={16} />}
        />
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 3 }}>
        <Select
          placeholder="Genre"
          value={filters.genre}
          onChange={(value) => updateFilters({ genre: value || undefined })}
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
