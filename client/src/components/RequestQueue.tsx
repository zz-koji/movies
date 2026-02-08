import type { ReactNode } from 'react';
import {
  ActionIcon,
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
  Title,
  Transition,
  Tooltip,
} from '@mantine/core';
import {
  IconBellPlus,
  IconClock,
  IconDownload,
  IconListCheck,
  IconTrash,
} from './icons';
import type { ExtendedMovieRequest } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface RequestQueueProps {
  requests: ExtendedMovieRequest[];
  loading: boolean;
  onOpenRequestModal: () => void;
  onDeleteRequest: (requestId: string) => void;
}

const STATUS_META: Record<
  ExtendedMovieRequest['status'],
  {
    label: string;
    color: string;
    description: string;
    icon: ReactNode;
  }
> = {
  queued: {
    label: 'Queued',
    color: 'gray',
    description: 'Waiting review',
    icon: <IconClock size={14} />,
  },
  processing: {
    label: 'Processing',
    color: 'blue',
    description: 'Being sourced',
    icon: <IconDownload size={14} />,
  },
  completed: {
    label: 'Completed',
    color: 'teal',
    description: 'Added to library',
    icon: <IconListCheck size={14} />,
  },
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

export function RequestQueue({
  requests,
  loading,
  onOpenRequestModal,
  onDeleteRequest,
}: RequestQueueProps) {
  const { context } = useAuth();
  const currentUserId = context.user?.id;

  const statusCounts = requests.reduce<Record<ExtendedMovieRequest['status'], number>>(
    (acc, request) => {
      acc[request.status] += 1;
      return acc;
    },
    { queued: 0, processing: 0, completed: 0 },
  );

  const hasRequests = requests.length > 0;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

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

        <SimpleGrid cols={{ base: 1, sm: 1, md: 2, lg: 3 }} spacing="md">
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
        ) : hasRequests ? (
          <ScrollArea.Autosize mah={360} offsetScrollbars type="scroll">
            <Stack gap="sm" py={4}>
              {requests.map((request) => {
                const statusMeta = STATUS_META[request.status];
                const isOwnRequest = currentUserId && request.requested_by === currentUserId;

                return (
                  <Transition
                    key={request.id}
                    mounted={true}
                    transition="slide-up"
                    duration={300}
                    timingFunction="ease"
                  >
                    {(styles) => (
                      <Paper withBorder p="md" radius="md" style={styles}>
                        <Stack gap="sm">
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Text fw={600} size="sm">
                                {request.title}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {formatDate(request.date_requested)}
                              </Text>
                              {request.notes && (
                                <Text size="xs" c="dimmed" lineClamp={2}>
                                  {request.notes}
                                </Text>
                              )}
                            </Stack>
                            <Group gap="xs" wrap="nowrap">
                              <Badge color={statusMeta.color} variant="light" size="sm">
                                {statusMeta.label}
                              </Badge>
                              {isOwnRequest && (
                                <Tooltip label="Delete request">
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={() => onDeleteRequest(request.id)}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </Group>
                          </Group>

                          <Group gap="xs">
                            <Badge color={getPriorityColor(request.priority)} variant="light" size="xs">
                              {request.priority} priority
                            </Badge>
                            {request.omdb_id && (
                              <Badge color="blue" variant="light" size="xs">
                                Linked to OMDb
                              </Badge>
                            )}
                          </Group>
                        </Stack>
                      </Paper>
                    )}
                  </Transition>
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
