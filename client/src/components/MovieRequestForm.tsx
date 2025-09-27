import { useMemo, useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea
} from '@mantine/core';
import { IconBellPlus, IconMovie, IconUser } from './icons';
import type { MovieRequest } from '../types';

interface MovieRequestFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (request: MovieRequest) => void;
}

export function MovieRequestForm({ opened, onClose, onSubmit }: MovieRequestFormProps) {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const isSubmitDisabled = useMemo(() => {
    return !title.trim() || !requestedBy.trim();
  }, [title, requestedBy]);

  const handleSubmit = () => {
    if (isSubmitDisabled) return;

    const request: MovieRequest = {
      title: title.trim(),
      year: year ? parseInt(year, 10) : undefined,
      description: description.trim() || undefined,
      requestedBy: requestedBy.trim(),
      priority
    };

    onSubmit(request);
    setTitle('');
    setYear('');
    setDescription('');
    setRequestedBy('');
    setPriority('medium');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Request a movie" centered radius="lg" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Let us know what to queue up next. Requests are stored locally and reviewed before the next
          sync run.
        </Text>

        <TextInput
          label="Movie title"
          placeholder="Enter the exact movie name"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          required
          leftSection={<IconMovie size={16} />}
        />

        <Group grow>
          <TextInput
            label="Release year"
            placeholder="e.g. 2024"
            value={year}
            onChange={(event) => setYear(event.currentTarget.value)}
            maxLength={4}
          />
          <Select
            label="Priority"
            value={priority}
            onChange={(value) => setPriority((value as typeof priority) ?? 'medium')}
            data={[
              { value: 'low', label: 'Low — grab when convenient' },
              { value: 'medium', label: 'Medium — add to the shortlist' },
              { value: 'high', label: 'High — next movie night pick' }
            ]}
          />
        </Group>

        <Textarea
          label="Why should we add this?"
          placeholder="Add any notes, links, or preferred editions"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          autosize
          minRows={3}
          maxLength={400}
        />

        <TextInput
          label="Your name"
          placeholder="Who is making this request?"
          value={requestedBy}
          onChange={(event) => setRequestedBy(event.currentTarget.value)}
          required
          leftSection={<IconUser size={16} />}
        />

        <Divider my="sm" />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            leftSection={<IconBellPlus size={16} />}
          >
            Submit request
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
