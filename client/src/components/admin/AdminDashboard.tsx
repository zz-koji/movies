import { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Menu,
  Paper,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconCheck,
  IconClock,
  IconDownload,
  IconSearch,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react'
import { useAuth } from '../../context/AuthContext'
import {
  useAdminRequests,
  useDashboardStats,
  useUpdateAdminRequest,
  useDeleteAdminRequest,
  useBulkUpdateStatus,
  useBulkDeleteRequests,
} from '../../hooks/useAdmin'
import type { AdminRequestFilters } from '../../api/admin'
import { formatDate } from '../../utils/date'

const STATUS_OPTIONS = [
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'gray',
  medium: 'yellow',
  high: 'red',
}

export function AdminDashboard() {
  const { context } = useAuth()
  const [filters, setFilters] = useState<AdminRequestFilters>({ page: 1, limit: 20 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: requestsData, isLoading: requestsLoading } = useAdminRequests(filters)
  const updateRequest = useUpdateAdminRequest()
  const deleteRequest = useDeleteAdminRequest()
  const bulkStatus = useBulkUpdateStatus()
  const bulkDelete = useBulkDeleteRequests()

  if (!context.user || context.user.role !== 'admin') {
    return (
      <Paper withBorder p="xl" ta="center">
        <Title order={3}>Access Denied</Title>
        <Text c="dimmed">You need admin access to view this page.</Text>
      </Paper>
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && requestsData) {
      setSelectedIds(new Set(requestsData.data.map((r) => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkStatus = (status: string) => {
    bulkStatus.mutate({ ids: Array.from(selectedIds), status })
    setSelectedIds(new Set())
  }

  const handleBulkDelete = () => {
    bulkDelete.mutate(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Admin Dashboard</Title>
          <Text c="dimmed">Manage movie requests and users</Text>
        </div>
      </Group>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={100} />)
        ) : (
          <>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Total Requests
                  </Text>
                  <Text size="xl" fw={700}>
                    {stats?.totalRequests ?? 0}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" variant="light">
                  <IconUsers size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Queued
                  </Text>
                  <Text size="xl" fw={700} c="gray">
                    {stats?.statusCounts.queued ?? 0}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" variant="light" color="gray">
                  <IconClock size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Processing
                  </Text>
                  <Text size="xl" fw={700} c="blue">
                    {stats?.statusCounts.processing ?? 0}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                  <IconDownload size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    Completed
                  </Text>
                  <Text size="xl" fw={700} c="teal">
                    {stats?.statusCounts.completed ?? 0}
                  </Text>
                </div>
                <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                  <IconCheck size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </>
        )}
      </SimpleGrid>

      {/* Filters */}
      <Paper withBorder p="md" radius="md">
        <Group>
          <TextInput
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch}>Search</Button>
          <Select
            placeholder="Status"
            data={STATUS_OPTIONS}
            value={filters.status?.[0] ?? null}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value ? [value] : undefined,
                page: 1,
              }))
            }
            clearable
          />
          <Select
            placeholder="Priority"
            data={PRIORITY_OPTIONS}
            value={filters.priority?.[0] ?? null}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                priority: value ? [value] : undefined,
                page: 1,
              }))
            }
            clearable
          />
        </Group>
      </Paper>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Paper withBorder p="md" radius="md" bg="dark.6">
          <Group justify="space-between">
            <Text>{selectedIds.size} selected</Text>
            <Group>
              <Menu>
                <Menu.Target>
                  <Button variant="light">Update Status</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {STATUS_OPTIONS.map((opt) => (
                    <Menu.Item key={opt.value} onClick={() => handleBulkStatus(opt.value)}>
                      {opt.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <Button color="red" variant="light" onClick={handleBulkDelete}>
                Delete Selected
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      {/* Requests Table */}
      <Paper withBorder radius="md">
        {requestsLoading ? (
          <Stack p="md">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={50} />
            ))}
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Checkbox
                      checked={
                        requestsData?.data.length
                          ? selectedIds.size === requestsData.data.length
                          : false
                      }
                      indeterminate={
                        selectedIds.size > 0 && selectedIds.size < (requestsData?.data.length ?? 0)
                      }
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Requested By</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th w={100}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {requestsData?.data.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onChange={(e) => handleSelectOne(request.id, e.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{request.title ?? 'Untitled'}</Text>
                      {request.omdb_id && (
                        <Text size="xs" c="dimmed">
                          {request.omdb_id}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>{request.requester_name}</Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        data={STATUS_OPTIONS}
                        value={request.status}
                        onChange={(value) =>
                          value && updateRequest.mutate({ id: request.id, data: { status: value } })
                        }
                        styles={{ input: { backgroundColor: 'transparent' } }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Badge color={PRIORITY_COLORS[request.priority]} variant="light">
                        {request.priority}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(request.date_requested)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => deleteRequest.mutate(request.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}

        {/* Pagination */}
        {requestsData && requestsData.pagination.totalPages > 1 && (
          <Group justify="center" p="md">
            <Button
              variant="subtle"
              disabled={filters.page === 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
            >
              Previous
            </Button>
            <Text>
              Page {requestsData.pagination.page} of {requestsData.pagination.totalPages}
            </Text>
            <Button
              variant="subtle"
              disabled={requestsData.pagination.page >= requestsData.pagination.totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
            >
              Next
            </Button>
          </Group>
        )}
      </Paper>
    </Stack>
  )
}
