import {
  Button,
  ComboboxSearch,
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
      priority: 'medium' as 'low' | 'medium' | 'high'
    },
    validate: zodResolver(movieRequestSchema)
  });

  const handleSubmit = form.onSubmit((values) => {
    const request: MovieRequest = {
      title: values.title.trim(),
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
            placeholder="Enter the name of the movie you want added to the library."
            required
            leftSection={<IconMovie size={16} />}
            {...form.getInputProps('title')}
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
