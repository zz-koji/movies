import { Alert, Button, Group, InputLabel, Modal, PinInput, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver as zodResolver } from 'mantine-form-zod-resolver';
import { IconAlertCircle, IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { loginSchema, type LoginCredentials } from '../../types';

interface RegisterModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ opened, onClose, onSubmit, onSwitchToLogin }: RegisterModalProps) {
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
      setError(result.error || 'Registration failed');
    }
  });

  const handleClose = () => {
    setError(null);
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Register" centered radius="lg" size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Create a new account to access the application.
          </Text>
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}
          <Stack gap="sm">
            <TextInput
              label="Username"
              placeholder="Choose a username"
              required
              disabled={isSubmitting}
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('name')}
            />
            <Stack gap={4}>
              <InputLabel htmlFor="register-pin">PIN (6 digits)</InputLabel>
              <PinInput id="register-pin" length={6} disabled={isSubmitting} {...form.getInputProps('pin')} />
              <Text size="xs" c="dimmed">
                Choose a 6-digit PIN to secure your account
              </Text>
            </Stack>
          </Stack>
          <Group justify="space-between" mt="md">
            <Button variant="subtle" size="sm" onClick={onSwitchToLogin} disabled={isSubmitting}>
              Already have an account? Login
            </Button>
            <Group>
              <Button variant="subtle" color="gray" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>Register</Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
