import {
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Badge,
  Button,
  Skeleton,
  ThemeIcon
} from '@mantine/core';
import {
  IconBellPlus,
  IconClock,
  IconDownload,
  IconListCheck
} from './icons';
import type { ExtendedMovieRequest } from '../api/requests';

interface RequestQueueProps {
  requests: ExtendedMovieRequest[];
  loading: boolean;
  onOpenRequestModal: () => void;
}

const getStatusColor = (status: ExtendedMovieRequest['status']) => {
  switch (status) {
    case 'completed':
      return 'teal';
    case 'processing':
      return 'blue';
    default:
      return 'gray';
  }
};

const getStatusIcon = (status: ExtendedMovieRequest['status']) => {
  switch (status) {
    case 'completed':
      return <IconListCheck size={14} />;
    case 'processing':
      return <IconDownload size={14} />;
    default:
      return <IconClock size={14} />;
  }
};

const getPriorityColor = (priority: ExtendedMovieRequest['priority']) => {
  switch (priority) {
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    default:
      return 'gray';
  }
};

export function RequestQueue({ requests, loading, onOpenRequestModal }: RequestQueueProps) {
  let queueContent = (
    <Stack gap="md">
      {requests.map((request) => (
        <Paper key={request.id} withBorder p={{ base: 'sm', sm: 'md' }} radius="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Text fw={600} size="sm">
                {request.title}
              </Text>
              <ThemeIcon
                size="sm"
                radius="xl"
                variant="light"
                color={getStatusColor(request.status)}
              >
                {getStatusIcon(request.status)}
              </ThemeIcon>
            </Group>

            <Text size="xs" c="dimmed">
              Requested by {request.requestedBy} • {request.submittedAt}
            </Text>

            {request.description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {request.description}
              </Text>
            )}

            <Group gap="xs" wrap="wrap">
              <Badge color={getStatusColor(request.status)} variant="light" size="xs">
                {request.status}
              </Badge>
              <Badge color={getPriorityColor(request.priority)} variant="light" size="xs">
                {request.priority} priority
              </Badge>
            </Group>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  if (loading) {
    queueContent = (
      <Stack gap="sm">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} height={80} radius="md" />
        ))}
      </Stack>
    );
  }

  return (
    <Paper withBorder radius="lg" p={{ base: 'md', sm: 'lg' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
              Request Queue
            </Text>
            <Title order={4}>Movie Requests</Title>
          </div>
          <Badge color="cyan" variant="light" size="lg">
            {requests.length}
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          Family movie requests are tracked here until they're added to the library.
        </Text>

        {queueContent}

        <Button
          variant="light"
          color="cyan"
          fullWidth
          leftSection={<IconBellPlus size={16} />}
          onClick={onOpenRequestModal}
        >
          Request a movie
        </Button>
      </Stack>
    </Paper>
  );
}
