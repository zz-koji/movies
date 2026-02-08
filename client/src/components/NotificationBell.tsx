import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Indicator,
  Menu,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core'
import { IconBell, IconCheck } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications'
import type { Notification } from '../api/notifications'
import { formatDate } from '../utils/date'

const TYPE_COLORS: Record<Notification['type'], string> = {
  request_status_changed: 'blue',
  request_matched: 'teal',
  comment_added: 'cyan',
  role_changed: 'violet',
}

export function NotificationBell() {
  const { context } = useAuth()
  const { data: notifications, isLoading } = useNotifications()
  const { data: unreadData } = useUnreadCount()
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  if (!context.user) {
    return null
  }

  const unreadCount = unreadData?.count ?? 0

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id)
    }
  }

  return (
    <Menu shadow="md" width={360} position="bottom-end">
      <Menu.Target>
        <Indicator
          disabled={unreadCount === 0}
          label={unreadCount > 9 ? '9+' : unreadCount}
          size={16}
          color="red"
          offset={4}
        >
          <ActionIcon variant="subtle" size="lg">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Group justify="space-between" p="xs">
          <Text fw={600}>Notifications</Text>
          {unreadCount > 0 && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconCheck size={14} />}
              onClick={() => markAllAsRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </Group>
        <Menu.Divider />
        <ScrollArea.Autosize mah={300} type="scroll">
          {isLoading ? (
            <Text p="md" ta="center" c="dimmed">
              Loading...
            </Text>
          ) : notifications && notifications.length > 0 ? (
            <Stack gap={0}>
              {notifications.map((notification) => (
                <Menu.Item
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  bg={notification.read_at ? undefined : 'dark.6'}
                >
                  <Stack gap={4}>
                    <Group justify="space-between" gap="xs">
                      <Badge
                        size="xs"
                        variant="light"
                        color={TYPE_COLORS[notification.type]}
                      >
                        {notification.type.replace(/_/g, ' ')}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {formatDate(notification.created_at, 'Recently')}
                      </Text>
                    </Group>
                    <Text size="sm" fw={500}>
                      {notification.title}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
                      {notification.message}
                    </Text>
                  </Stack>
                </Menu.Item>
              ))}
            </Stack>
          ) : (
            <Text p="md" ta="center" c="dimmed">
              No notifications
            </Text>
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  )
}
