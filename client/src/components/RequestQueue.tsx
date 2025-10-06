import type { ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title
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

const STATUS_META: Record<ExtendedMovieRequest['status'], {
  label: string;
  color: string;
  description: string;
  icon: ReactNode;
}> = {
  queued: {
    label: 'Queued',
    color: 'gray',
    description: 'Waiting review',
    icon: <IconClock size={14} />
  },
  processing: {
    label: 'Processing',
    color: 'blue',
    description: 'Being sourced',
    icon: <IconDownload size={14} />
  },
  completed: {
    label: 'Completed',
    color: 'teal',
    description: 'Added to library',
    icon: <IconListCheck size={14} />
  }
};

const STATUS_ORDER: ExtendedMovieRequest['status'][] = ['queued', 'processing', 'completed'];

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

const getInitials = (name: string) => {
  if (!name) {
    return '?';
  }

  const parts = name.trim().split(/\s+/);
  const initials = parts
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return initials || name[0]?.toUpperCase() || '?';
};

export function RequestQueue({ requests, loading, onOpenRequestModal }: RequestQueueProps) {
  const statusCounts = requests.reduce<Record<ExtendedMovieRequest['status'], number>>(
    (acc, request) => {
      acc[request.status] += 1;
      return acc;
    },
    { queued: 0, processing: 0, completed: 0 }
  );

  const hasRequests = requests.length > 0;

  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
              Request Queue
            </Text>
            <Title order={4} size="h3">
              Movie Requests
            </Title>
            <Text size="sm" c="dimmed">
              Keep track of what the household is itching to watch next.
            </Text>
          </Stack>
          <Badge color="cyan" variant="light" size="lg">
            {requests.length}
          </Badge>
        </Group>

        <SimpleGrid
          cols={3}
          spacing="md"
          breakpoints={[
            { maxWidth: 'lg', cols: 3 },
            { maxWidth: 'md', cols: 2 },
            { maxWidth: 'sm', cols: 1 }
          ]}
        >
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            return (
              <Paper key={status} withBorder radius="md" p="md">
                <Group justify="space-between" align="flex-start" gap="xs">
                  <Stack gap={2}>
                    <Group gap="xs" align="center">
                      <ThemeIcon size="sm" radius="xl" variant="light" color={meta.color}>
                        {meta.icon}
                    </ThemeIcon>
                    <Text fw={600} size="sm">
                      {meta.label}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {meta.description}
                  </Text>
                </Stack>
                <Text fw={700}>{statusCounts[status]}</Text>
              </Group>
            </Paper>
            );
          })}
        </SimpleGrid>

        <Divider my="xs" variant="dashed" />

        {loading ? (
          <Stack gap="sm" py={4}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={96} radius="md" />
            ))}
          </Stack>
        ) : (
          hasRequests ? (
            <ScrollArea.Autosize mah={360} offsetScrollbars type="scroll">
              <Stack gap="sm" py={4}>
                {requests.map((request) => {
                  const statusMeta = STATUS_META[request.status];
                  return (
                    <Paper key={request.id} withBorder p="md" radius="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap="sm" align="flex-start" wrap="nowrap">
                            <Avatar radius="xl" size="sm" color="cyan">
                              {getInitials(request.requestedBy)}
                            </Avatar>
                            <Stack gap={2}>
                              <Text fw={600} size="sm">
                                {request.title}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Requested by {request.requestedBy} • {request.submittedAt}
                              </Text>
                            </Stack>
                          </Group>
                          <Badge color={statusMeta.color} variant="light" size="sm">
                            {statusMeta.label}
                          </Badge>
                        </Group>

                        {request.description && (
                          <Text size="sm" c="dimmed" lineClamp={3}>
                            {request.description}
                          </Text>
                        )}

                        <Group gap="xs">
                          <Badge color={statusMeta.color} variant="light" size="xs">
                            {statusMeta.label}
                          </Badge>
                          <Badge color={getPriorityColor(request.priority)} variant="light" size="xs">
                            {request.priority} priority
                          </Badge>
                        </Group>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          ) : (
            <Paper withBorder radius="md" p="xl" ta="center">
              <Stack gap="sm" align="center">
                <ThemeIcon size="lg" radius="xl" variant="light" color="cyan">
                  <IconBellPlus size={18} />
                </ThemeIcon>
                <Text fw={600}>No requests yet</Text>
                <Text size="sm" c="dimmed">
                  Queue a movie to see it appear here with its status and priority.
                </Text>
              </Stack>
            </Paper>
          )
        )}

        <Button
          variant="gradient"
          gradient={{ from: 'cyan', to: 'indigo' }}
          fullWidth
          leftSection={<IconBellPlus size={16} />}
          onClick={onOpenRequestModal}
          size="md"
        >
          Add a request
        </Button>
      </Stack>
    </Paper>
  );
}
