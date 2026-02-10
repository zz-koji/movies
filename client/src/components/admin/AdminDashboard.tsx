import { useState, useMemo, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  FileButton,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Spoiler,
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
  IconInfoCircle,
  IconMovie,
  IconSearch,
  IconTrash,
  IconUpload,
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
import { MovieUploadSection } from '../MovieUploadSection'
import { uploadMovie } from '../../api/uploads'
import { LoginModal } from '../auth/LoginModal'
import { RegisterModal } from '../auth/RegisterModal'
import { IconLogin } from '@tabler/icons-react'
import { useMovies } from '../../hooks/useMovies'
import { getStorageUsage } from '../../api/storage';
import { StorageTable } from '../StorageTable';

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
  const auth = useAuth()
  const { context } = auth
  const [filters, setFilters] = useState<AdminRequestFilters>({ page: 1, limit: 20 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [quickUploadModal, setQuickUploadModal] = useState<{ requestId: string; title: string; omdbId: string | null } | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: requestsData, isLoading: requestsLoading } = useAdminRequests(filters)
  const updateRequest = useUpdateAdminRequest()
  const deleteRequest = useDeleteAdminRequest()
  const bulkStatus = useBulkUpdateStatus()
  const bulkDelete = useBulkDeleteRequests()

  if (!context.user) {
    return (
      <>
        <Paper withBorder p="xl" ta="center">
          <Stack gap="md">
            <Title order={3}>Authentication Required</Title>
            <Text c="dimmed">Please login to access the admin dashboard.</Text>
            <Group justify="center">
              <Button leftSection={<IconLogin size={16} />} onClick={auth.openLoginModal}>
                Login
              </Button>
              <Button variant="light" onClick={auth.openRegisterModal}>
                Register
              </Button>
            </Group>
          </Stack>
        </Paper>

        <LoginModal
          opened={auth.loginModalOpened}
          onClose={auth.closeLoginModal}
          onSubmit={auth.handleLogin}
          onSwitchToRegister={auth.switchToRegister}
        />

        <RegisterModal
          opened={auth.registerModalOpened}
          onClose={auth.closeRegisterModal}
          onSubmit={auth.handleRegister}
          onSwitchToLogin={auth.switchToLogin}
        />
      </>
    )
  }

  if (context.user.role !== 'admin') {
    return (
      <Paper withBorder p="xl" ta="center">
        <Title order={3}>Access Denied</Title>
        <Text c="dimmed">You need admin privileges to view this page.</Text>
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

  const handleQuickUpload = async (movieFile: File | null, subtitleFile: File | null, omdbId: string) => {
    if (!movieFile || !omdbId) return

    setUploadingFile(true)
    setUploadProgress(0)

    try {
      await uploadMovie({
        file: movieFile,
        subtitleFile,
        omdbId,
        onProgress: (progress) => setUploadProgress(progress),
      })

      // Update request with OMDB ID and mark as completed
      await updateRequest.mutateAsync({
        id: quickUploadModal!.requestId,
        data: { status: 'completed' },
      })

      setQuickUploadModal(null)
    } catch (error) {
      console.error('Upload failed:', error)
      alert(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploadingFile(false)
      setUploadProgress(0)
    }
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2}>Admin Dashboard</Title>
          <Text c="dimmed">Manage movie requests and users</Text>
        </div>
      </Group>

<Spoiler maxHeight={0} showLabel="Inspect Storage" hideLabel="Hide Storage Usage" >
      <StorageTable />
</Spoiler>

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
                      <Anchor
                        href={`https://thepiratebay11.com/search/${encodeURIComponent(request.title ?? 'Untitled')}/1/99/0`}
                        target="_blank"
                        rel="noopener noreferrer"
                        fw={500}
                      >
                        {request.title ?? 'Untitled'}
                      </Anchor>
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
                        <Tooltip label="Quick Upload">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() =>
                              setQuickUploadModal({
                                requestId: request.id,
                                title: request.title ?? 'Untitled',
                                omdbId: request.omdb_id,
                              })
                            }
                          >
                            <IconUpload size={16} />
                          </ActionIcon>
                        </Tooltip>
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

      {/* Movie Upload Section */}
      <MovieUploadSection
        isAuthenticated={true}
        onRequestLogin={() => {}}
        onUploadSuccess={() => {}}
      />

      {/* Quick Upload Modal */}
      <QuickUploadModal
        opened={quickUploadModal !== null}
        onClose={() => setQuickUploadModal(null)}
        title={quickUploadModal?.title ?? ''}
        initialOmdbId={quickUploadModal?.omdbId ?? null}
        uploading={uploadingFile}
        progress={uploadProgress}
        onUpload={handleQuickUpload}
      />
    </Stack>
  )
}

interface OmdbSearchResult {
  Title: string
  Year: string
  imdbID: string
  Type?: string
  Poster?: string
}

interface QuickUploadModalProps {
  opened: boolean
  onClose: () => void
  title: string
  initialOmdbId: string | null
  uploading: boolean
  progress: number
  onUpload: (movieFile: File | null, subtitleFile: File | null, omdbId: string) => void
}

function QuickUploadModal({ opened, onClose, title, initialOmdbId, uploading, progress, onUpload }: QuickUploadModalProps) {
  const [movieFile, setMovieFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState(title)
  const [selectedOmdb, setSelectedOmdb] = useState<OmdbSearchResult | null>(null)
  const [debouncedQuery] = useDebounce(searchQuery, 500)

  const queryIsActive = debouncedQuery.trim().length >= 2

  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchError,
  } = useMovies({ title: debouncedQuery, page: 1 }, queryIsActive)

  const omdbResults = useMemo<OmdbSearchResult[]>(() => {
    if (!queryIsActive) return []
    const rawResults = (searchData as { Search?: OmdbSearchResult[] } | undefined)?.Search
    if (!Array.isArray(rawResults)) return []
    return rawResults.slice(0, 8)
  }, [queryIsActive, searchData])

  const omdbResponseError = useMemo(() => {
    if (!queryIsActive || searchLoading) return undefined
    const response = searchData as { Response?: string; Error?: string } | undefined
    if (response?.Response === 'False' && response.Error) return response.Error
    if (!searchLoading && omdbResults.length === 0 && !response?.Error) {
      return 'No matching titles found. Try refining your search.'
    }
    return undefined
  }, [queryIsActive, omdbResults.length, searchData, searchLoading])

  const handleUpload = () => {
    const omdbId = selectedOmdb?.imdbID || initialOmdbId
    if (!omdbId) return
    onUpload(movieFile, subtitleFile, omdbId)
    setMovieFile(null)
    setSubtitleFile(null)
    setSelectedOmdb(null)
  }

  const handleClose = () => {
    setMovieFile(null)
    setSubtitleFile(null)
    setSelectedOmdb(null)
    setSearchQuery(title)
    onClose()
  }

  const hasOmdbId = Boolean(selectedOmdb || initialOmdbId)

  return (
    <Modal opened={opened} onClose={handleClose} title={`Quick Upload: ${title}`} size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Upload movie file and link to OMDB metadata
        </Text>

        {/* File Selection */}
        <Stack gap="xs">
          <FileButton onChange={setMovieFile} accept="video/*">
            {(props) => (
              <Button {...props} leftSection={<IconDownload size={16} />} fullWidth>
                {movieFile ? movieFile.name : 'Select Movie File'}
              </Button>
            )}
          </FileButton>

          <FileButton onChange={setSubtitleFile} accept=".srt">
            {(props) => (
              <Button {...props} leftSection={<IconDownload size={16} />} variant="light" fullWidth>
                {subtitleFile ? subtitleFile.name : 'Select Subtitle (Optional)'}
              </Button>
            )}
          </FileButton>
        </Stack>

        {/* OMDB Search */}
        {!initialOmdbId && (
          <Stack gap="xs">
            <TextInput
              label="Search OMDB"
              placeholder="Search for movie title"
              leftSection={<IconMovie size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {selectedOmdb && (
              <Paper withBorder p="sm" radius="md" bg="blue.0">
                <Group justify="space-between">
                  <div>
                    <Text fw={600} size="sm">{selectedOmdb.Title}</Text>
                    <Text size="xs" c="dimmed">{selectedOmdb.Year}</Text>
                  </div>
                  <Badge color="blue">Selected</Badge>
                </Group>
              </Paper>
            )}

            {!selectedOmdb && (
              <ScrollArea.Autosize mah={300} type="auto">
                <Stack gap="xs">
                  {searchLoading && (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="xs" c="dimmed">Searching OMDB…</Text>
                    </Group>
                  )}

                  {searchError && (
                    <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                      Search failed. Please try again.
                    </Alert>
                  )}

                  {omdbResponseError && (
                    <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
                      {omdbResponseError}
                    </Alert>
                  )}

                  {!searchLoading && !searchError && omdbResults.map((movie) => (
                    <Paper
                      key={movie.imdbID}
                      withBorder
                      radius="md"
                      p="sm"
                      onClick={() => setSelectedOmdb(movie)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={600} size="sm">{movie.Title}</Text>
                          <Text size="xs" c="dimmed">
                            {movie.Year} • {movie.Type ? movie.Type.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Movie'}
                          </Text>
                        </div>
                        <Badge variant="light" size="xs">Select</Badge>
                      </Group>
                    </Paper>
                  ))}

                  {!queryIsActive && (
                    <Text size="xs" c="dimmed">
                      Type at least 2 characters to search
                    </Text>
                  )}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Stack>
        )}

        {initialOmdbId && (
          <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
            This request already has OMDB metadata linked (ID: {initialOmdbId})
          </Alert>
        )}

        {/* Upload Progress */}
        {uploading && (
          <Stack gap="xs">
            <Text size="sm">Uploading: {progress}%</Text>
            <Progress value={progress} animated />
          </Stack>
        )}

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!movieFile || !hasOmdbId || uploading}
            loading={uploading}
          >
            Upload
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
