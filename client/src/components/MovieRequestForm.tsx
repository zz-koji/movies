import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver as zodResolver } from 'mantine-form-zod-resolver';
import { useMemo, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { IconBellPlus, IconInfoCircle, IconMovie } from './icons';
import { movieRequestSchema, type MovieRequest } from '../types';
import { useMovies } from '../hooks/useMovies';

interface MovieRequestFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (request: MovieRequest) => void;
  isSubmitting?: boolean;
}

interface OmdbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type?: string;
  Poster?: string;
}

export function MovieRequestForm({ opened, onClose, onSubmit, isSubmitting = false }: MovieRequestFormProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);
  const [selectedMovie, setSelectedMovie] = useState<OmdbSearchResult | null>(null);

  const form = useForm({
    initialValues: {
      title: '',
      priority: 'medium' as 'low' | 'medium' | 'high',
      notes: '',
    },
    validate: zodResolver(movieRequestSchema),
  });

  const queryIsActive = debouncedQuery.trim().length >= 2;

  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchError,
  } = useMovies({ title: debouncedQuery, page: 1 }, queryIsActive);

  const omdbResults = useMemo<OmdbSearchResult[]>(() => {
    if (!queryIsActive) {
      return [];
    }

    const rawResults = (searchData as { Search?: OmdbSearchResult[] } | undefined)?.Search;
    if (!Array.isArray(rawResults)) {
      return [];
    }

    return rawResults.slice(0, 8);
  }, [queryIsActive, searchData]);

  const omdbResponseError = useMemo(() => {
    if (!queryIsActive || searchLoading) {
      return undefined;
    }

    const response = searchData as { Response?: string; Error?: string } | undefined;
    if (response?.Response === 'False' && response.Error) {
      return response.Error;
    }

    if (!searchLoading && omdbResults.length === 0 && !response?.Error) {
      return 'No matching titles found. Try refining your search.';
    }

    return undefined;
  }, [omdbResults.length, queryIsActive, searchData, searchLoading]);

  const handleSubmit = form.onSubmit(async (values) => {
    if (isSubmitting) return;

    const request: MovieRequest = {
      title: values.title.trim(),
      priority: values.priority,
      notes: values.notes.trim() || undefined,
      omdb_id: selectedMovie?.imdbID,
    };

    onSubmit(request);
    form.reset();
    setQuery('');
    setSelectedMovie(null);
  });

  const handleClose = () => {
    form.reset();
    setQuery('');
    setSelectedMovie(null);
    onClose();
  };

  const handleSelectMovie = (movie: OmdbSearchResult) => {
    setSelectedMovie(movie);
    form.setFieldValue('title', movie.Title);
    setQuery('');
  };

  const renderSearchResults = () => {
    if (!queryIsActive) {
      return (
        <Text size="xs" c="dimmed">
          Type at least two characters to search the OMDb catalog.
        </Text>
      );
    }

    if (searchLoading) {
      return (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Searching OMDb…
          </Text>
        </Group>
      );
    }

    if (searchError) {
      return (
        <Alert color="red" variant="light" title="Search failed" icon={<IconInfoCircle size={16} />}>
          {searchError instanceof Error
            ? searchError.message
            : 'Unable to search OMDb. Please try again later.'}
        </Alert>
      );
    }

    if (omdbResponseError) {
      return (
        <Alert color="yellow" variant="light" title="No results" icon={<IconInfoCircle size={16} />}>
          {omdbResponseError}
        </Alert>
      );
    }

    return (
      <ScrollArea.Autosize mah={300} type="auto">
        <Stack gap="xs">
          {omdbResults.map((movie) => (
            <Paper
              key={movie.imdbID}
              withBorder
              radius="md"
              p="sm"
              onClick={() => handleSelectMovie(movie)}
              style={{
                cursor: 'pointer',
              }}
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600} size="sm">
                    {movie.Title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {movie.Year} • {movie.Type ? movie.Type.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Movie'}
                  </Text>
                </div>
                <Badge color="gray" variant="light" size="xs">
                  Select
                </Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    );
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Request a movie" centered radius="lg" size="lg">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Let us know what to queue up next. Requests are stored and reviewed before the next
            sync run.
          </Text>

          {selectedMovie && (
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={600}>
                    Linked to: {selectedMovie.Title} ({selectedMovie.Year})
                  </Text>
                </div>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    setSelectedMovie(null);
                    form.setFieldValue('title', '');
                  }}
                >
                  Clear
                </Button>
              </Group>
            </Alert>
          )}

          <TextInput
            label="Movie title"
            placeholder="Enter the name of the movie you want added to the library"
            required
            disabled={isSubmitting}
            leftSection={<IconMovie size={16} />}
            {...form.getInputProps('title')}
          />

          <Stack gap="xs">
            <TextInput
              label="Search OMDb (optional)"
              placeholder="Search to link this request to a specific movie"
              leftSection={<IconMovie size={16} />}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {renderSearchResults()}
          </Stack>

          <Select
            label="Priority"
            disabled={isSubmitting}
            data={[
              { value: 'low', label: 'Low — grab when convenient' },
              { value: 'medium', label: 'Medium — add to the shortlist' },
              { value: 'high', label: 'High — next movie night pick' },
            ]}
            value={form.values.priority}
            onChange={(value) => {
              if (value) form.setFieldValue('priority', value as 'low' | 'medium' | 'high');
            }}
            error={form.errors.priority}
          />

          <Textarea
            label="Notes (optional)"
            placeholder="Any additional details or preferences..."
            disabled={isSubmitting}
            minRows={3}
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconBellPlus size={16} />} loading={isSubmitting}>
              Submit request
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
