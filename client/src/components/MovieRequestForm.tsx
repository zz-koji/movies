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
import { useForm } from '@mantine/form';
import { zod4Resolver as zodResolver } from 'mantine-form-zod-resolver';
import { IconBellPlus, IconMovie, IconUser } from './icons';
import { movieRequestSchema, type MovieRequest } from '../types';

interface MovieRequestFormProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (request: MovieRequest) => void;
}

export function MovieRequestForm({ opened, onClose, onSubmit }: MovieRequestFormProps) {
  const form = useForm({
    initialValues: {
      title: '',
      year: '',
      description: '',
      requestedBy: '',
      priority: 'medium' as 'low' | 'medium' | 'high'
    },
    validate: zodResolver(movieRequestSchema)
  });

  const handleSubmit = form.onSubmit((values) => {
    const request: MovieRequest = {
      title: values.title.trim(),
      year: values.year?.trim() || undefined,
      description: values.description?.trim() || undefined,
      requestedBy: values.requestedBy.trim(),
      priority: values.priority
    };

    onSubmit(request);
    form.reset();
    onClose();
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Request a movie" centered radius="lg" size="lg">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Let us know what to queue up next. Requests are stored locally and reviewed before the next
            sync run.
          </Text>

          <TextInput
            label="Movie title"
            placeholder="Enter the exact movie name"
            required
            leftSection={<IconMovie size={16} />}
            {...form.getInputProps('title')}
          />

          <Group grow>
            <TextInput
              label="Release year"
              placeholder="e.g. 2024"
              maxLength={4}
              {...form.getInputProps('year')}
            />
            <Select
              label="Priority"
              data={[
                { value: 'low', label: 'Low — grab when convenient' },
                { value: 'medium', label: 'Medium — add to the shortlist' },
                { value: 'high', label: 'High — next movie night pick' }
              ]}
              {...form.getInputProps('priority')}
            />
          </Group>

          <Textarea
            label="Why should we add this?"
            placeholder="Add any notes, links, or preferred editions"
            autosize
            minRows={3}
            maxLength={400}
            {...form.getInputProps('description')}
          />

          <TextInput
            label="Your name"
            placeholder="Who is making this request?"
            required
            leftSection={<IconUser size={16} />}
            {...form.getInputProps('requestedBy')}
          />

          <Divider my="sm" />

          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconBellPlus size={16} />}>
              Submit request
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
