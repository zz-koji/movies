import { Button, Center, Group, InputLabel, Modal, PinInput, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver as zodResolver } from 'mantine-form-zod-resolver';
import { IconUser } from '@tabler/icons-react';
import { loginSchema, type LoginCredentials } from '../../types';

interface LoginModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (credentials: LoginCredentials) => void;
}

export function LoginModal({ opened, onClose, onSubmit }: LoginModalProps) {
  const form = useForm({
    initialValues: {
      name: '',
      pin: ''
    },
    validate: zodResolver(loginSchema)
  });

  const handleSubmit = form.onSubmit((values) => {
    onSubmit(values);
    form.reset();
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Login" centered radius="lg" size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your credentials to access the application.
          </Text>
          <Stack align='center'>
            <TextInput
              label="Username"
              placeholder="Enter your username"
              required
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('name')}
            />
            <Group>            <InputLabel>Pin</InputLabel>
              <PinInput
                length={6}
                {...form.getInputProps('pin')}
              /></Group>

          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Login</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
