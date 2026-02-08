import { Alert, Button, Group, InputLabel, Modal, PinInput, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver as zodResolver } from 'mantine-form-zod-resolver';
import { IconAlertCircle, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { loginSchema, type LoginCredentials } from '../../types';

interface LoginModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
}

export function LoginModal({ opened, onClose, onSubmit }: LoginModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      pin: ''
    },
    validate: zodResolver(loginSchema)
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit(values);
    setIsSubmitting(false);

    if (result.success) {
      form.reset();
    } else {
      setError(result.error || 'Login failed');
    }
  });

  const handleClose = () => {
    setError(null);
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Login" centered radius="lg" size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your credentials to access the application.
          </Text>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}
          <Stack gap="sm">
            <TextInput
              label="Username"
              placeholder="Enter your username"
              required
              disabled={isSubmitting}
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('name')}
            />
            <Stack gap={4}>
              <InputLabel htmlFor="login-pin">PIN</InputLabel>
              <PinInput id="login-pin" length={6} disabled={isSubmitting} {...form.getInputProps('pin')} />
            </Stack>
          </Stack>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" color="gray" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>Login</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
