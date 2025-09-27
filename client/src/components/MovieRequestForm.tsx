import { useState } from 'react';
import { Modal, TextInput, Textarea, Select, Button, Group } from '@mantine/core';
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

  const handleSubmit = () => {
    if (!title.trim() || !requestedBy.trim()) return;

    const request: MovieRequest = {
      title: title.trim(),
      year: year ? parseInt(year) : undefined,
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
    <Modal opened={opened} onClose={onClose} title="Request a Movie" centered>
      <TextInput
        label="Movie Title"
        placeholder="Enter movie title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        mb="md"
      />

      <TextInput
        label="Year"
        placeholder="e.g. 2023"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        mb="md"
      />

      <Textarea
        label="Description"
        placeholder="Why would you like this movie added?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        mb="md"
        rows={3}
      />

      <TextInput
        label="Your Name"
        placeholder="Enter your name"
        value={requestedBy}
        onChange={(e) => setRequestedBy(e.target.value)}
        required
        mb="md"
      />

      <Select
        label="Priority"
        value={priority}
        onChange={(value) => setPriority(value as 'low' | 'medium' | 'high')}
        data={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' }
        ]}
        mb="md"
      />

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!title.trim() || !requestedBy.trim()}
        >
          Submit Request
        </Button>
      </Group>
    </Modal>
  );
}