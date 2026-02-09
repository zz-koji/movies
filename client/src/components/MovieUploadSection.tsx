import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebounce } from 'use-debounce';
import {
  IconInfoCircle,
  IconLink,
  IconLogin,
  IconMovie,
  IconPlayerPlay,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { uploadMovie } from '../api/uploads';
import { useMovies } from '../hooks/useMovies';

interface MovieUploadSectionProps {
  isAuthenticated: boolean;
  onRequestLogin: () => void;
  onUploadSuccess?: () => Promise<void> | void;
}

interface OmdbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type?: string;
  Poster?: string;
}

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'canceled';

interface UploadQueueItem {
  id: string;
  file: File;
  subtitleFile: File | null;
  status: UploadStatus;
  progress: number | null;
  omdbMovie: OmdbSearchResult | null;
  errorMessage: string | null;
}

const generateQueueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatFileSize = (size: number) => {
  if (Number.isNaN(size) || size <= 0) {
    return 'Unknown size';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  let value = size;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const COMMON_FILENAME_TOKENS = new Set([
  '1080p',
  '720p',
  '2160p',
  '480p',
  '4k',
  'uhd',
  'hdr',
  'hdr10',
  'hdr10+',
  'dolby',
  'vision',
  'dv',
  'remux',
  'webdl',
  'web-dl',
  'webrip',
  'hdrip',
  'bluray',
  'blu-ray',
  'brrip',
  'bdrip',
  'rip',
  'x264',
  'x265',
  'h264',
  'h265',
  'hevc',
  'av1',
  'aac',
  'dts',
  'truehd',
  'atmos',
  'remastered',
  'extended',
  'repack',
  'proper',
  'multi',
  'dual',
  'dubbed',
  'subbed',
  'sample',
  '10bit',
  '8bit',
  'yify',
  'yts',
  'amzn',
  'imax',
  'cam',
  'ts',
  'hc',
]);

const createSearchQueryFromFilename = (filename: string): string => {
  if (!filename) {
    return '';
  }

  const withoutExtension = filename.replace(/\.[^./\\]+$/, '');
  const withoutYears = withoutExtension
    .replace(/\(\s*(?:19|20)\d{2}\s*\)/gi, '')
    .replace(/\b(?:19|20)\d{2}\b/g, '');
  const normalized = withoutYears
    .replace(/[()[\]]/g, ' ')
    .replace(/[_.]+/g, ' ')
    .replace(/-+/g, ' ');

  const pieces = normalized
    .split(/\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean);

  const cleanedPieces: string[] = [];

  for (const piece of pieces) {
    const alphanumeric = piece.replace(/[^a-zA-Z0-9']/g, '');
    if (!alphanumeric) {
      continue;
    }

    const lower = alphanumeric.toLowerCase();

    if (COMMON_FILENAME_TOKENS.has(lower)) {
      continue;
    }

    if (/^\d+x\d+$/.test(lower)) {
      continue;
    }

    if (/^\d{3,4}p$/.test(lower)) {
      continue;
    }

    if (/^\d{2,3}bit$/.test(lower)) {
      continue;
    }

    cleanedPieces.push(alphanumeric);
  }

  const query = cleanedPieces.join(' ').trim();
  const fallbackBase = withoutYears.replace(/[._-]+/g, ' ').trim();
  return query || fallbackBase;
};

const getStatusMeta = (item: UploadQueueItem) => {
  switch (item.status) {
    case 'pending':
      if (item.omdbMovie) {
        return { label: 'Ready', color: 'blue' as const };
      }
      return { label: 'Pending', color: 'gray' as const };
    case 'uploading':
      return { label: 'Uploading', color: 'blue' as const };
    case 'success':
      return { label: 'Uploaded', color: 'teal' as const };
    case 'error':
      return { label: 'Failed', color: 'red' as const };
    case 'canceled':
      return { label: 'Canceled', color: 'yellow' as const };
    default:
      return { label: 'Unknown', color: 'gray' as const };
  }
};

const canLinkMetadata = (status: UploadStatus) => status === 'pending' || status === 'error' || status === 'canceled';

export function MovieUploadSection({
  isAuthenticated,
  onRequestLogin,
  onUploadSuccess,
}: MovieUploadSectionProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<UploadQueueItem[]>([]);
  const [fileInputValue, setFileInputValue] = useState<File[] | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [autoUpload, setAutoUpload] = useState(false);
  const [userEditedQuery, setUserEditedQuery] = useState(false);

  const queueItemsRef = useRef<UploadQueueItem[]>([]);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const prevActiveItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    queueItemsRef.current = queueItems;
  }, [queueItems]);

  useEffect(() => {
    if (queueItems.length === 0) {
      setActiveItemId(null);
      setQuery('');
      return;
    }

    if (activeItemId && queueItems.some((item) => item.id === activeItemId)) {
      return;
    }

    setActiveItemId(queueItems[0]?.id ?? null);
  }, [activeItemId, queueItems]);

  const activeItem = useMemo(
    () => queueItems.find((item) => item.id === activeItemId) ?? null,
    [activeItemId, queueItems],
  );

  useEffect(() => {
    if (!activeItem) {
      prevActiveItemIdRef.current = null;
      setUserEditedQuery(false);
      setSubtitleFile(null);
      if (query !== '') {
        setQuery('');
      }
      return;
    }

    // Sync subtitle file with active item
    if (activeItem.subtitleFile !== subtitleFile) {
      setSubtitleFile(activeItem.subtitleFile);
    }

    if (!canLinkMetadata(activeItem.status)) {
      prevActiveItemIdRef.current = activeItem.id;
      setUserEditedQuery(false);
      if (query !== '') {
        setQuery('');
      }
      return;
    }

    const itemChanged = prevActiveItemIdRef.current !== activeItem.id;
    const suggestion = createSearchQueryFromFilename(activeItem.file.name);

    if (itemChanged || !userEditedQuery) {
      if (userEditedQuery) {
        setUserEditedQuery(false);
      }
      if (query !== suggestion) {
        setQuery(suggestion);
      }
    }

    prevActiveItemIdRef.current = activeItem.id;
  }, [activeItem, query, userEditedQuery]);

  const handleFilesSelected = useCallback((value: File | File[] | null) => {
    if (!value) {
      setFileInputValue(null);
      return;
    }

    const files = Array.isArray(value) ? value : [value];
    if (files.length === 0) {
      setFileInputValue(null);
      return;
    }

    const newItems: UploadQueueItem[] = files.map((file) => ({
      id: generateQueueId(),
      file,
      subtitleFile: null,
      status: 'pending',
      progress: null,
      omdbMovie: null,
      errorMessage: null,
    }));

    setQueueItems((prev) => [...prev, ...newItems]);
    setFileInputValue(null);

    setActiveItemId((current) => current ?? newItems[0]?.id ?? null);
  }, []);

  const handleAssignActiveItem = useCallback(
    (movie: OmdbSearchResult) => {
      if (!activeItemId) {
        return;
      }

      let didAssign = false;
      let updatedItems: UploadQueueItem[] = [];

      setQueueItems((prev) => {
        const nextItems = prev.map((item) => {
          if (item.id !== activeItemId) {
            return item;
          }

          if (!canLinkMetadata(item.status)) {
            return item;
          }

          didAssign = true;
          return {
            ...item,
            omdbMovie: movie,
            status: 'pending' as const,
            progress: null,
            errorMessage: null,
          };
        });

        updatedItems = nextItems;
        return nextItems;
      });

      if (!didAssign) {
        return;
      }

      const nextItem = updatedItems.find(
        (item) => item.id !== activeItemId && canLinkMetadata(item.status) && !item.omdbMovie,
      );

      if (nextItem) {
        setActiveItemId(nextItem.id);
        const suggestion = createSearchQueryFromFilename(nextItem.file.name);
        setUserEditedQuery(false);
        setQuery(suggestion);
      } else {
        setUserEditedQuery(false);
        setQuery('');
      }
    },
    [activeItemId, setQuery, setUserEditedQuery],
  );

  const startUpload = useCallback(async (itemId: string) => {
    const queueItem = queueItemsRef.current.find((item) => item.id === itemId);
    if (!queueItem) {
      return;
    }

    if (queueItem.status === 'uploading' || queueItem.status === 'success') {
      return;
    }

    if (!queueItem.omdbMovie) {
      setActiveItemId(itemId);
      return;
    }

    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: 'uploading', progress: 0, errorMessage: null }
          : item,
      ),
    );

    const controller = new AbortController();
    controllersRef.current.set(itemId, controller);

    try {
      await uploadMovie({
        file: queueItem.file,
        subtitleFile: queueItem.subtitleFile,
        omdbId: queueItem.omdbMovie.imdbID,
        signal: controller.signal,
        onProgress: (progress) => {
          setQueueItems((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, progress } : item)),
          );
        },
      });

      controllersRef.current.delete(itemId);

      setQueueItems((prev) => {
        const nextItems = prev.filter((item) => item.id !== itemId);
        queueItemsRef.current = nextItems;
        return nextItems;
      });

      setActiveItemId((current) => {
        if (current === itemId) {
          return queueItemsRef.current[0]?.id ?? null;
        }
        return current;
      });

      await onUploadSuccess?.();
    } catch (error) {
      controllersRef.current.delete(itemId);
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      setQueueItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          if (isAbort) {
            return {
              ...item,
              status: 'canceled',
              progress: null,
              errorMessage: 'Upload canceled.',
            };
          }

          const message = error instanceof Error ? error.message : 'Failed to upload movie.';
          return {
            ...item,
            status: 'error',
            progress: null,
            errorMessage: message,
          };
        }),
      );

      if (!isAbort) {
        console.error('Failed to upload movie', error);
      }
    }
  }, [onUploadSuccess]);

  const handleCancelUpload = useCallback((itemId: string) => {
    const controller = controllersRef.current.get(itemId);
    if (!controller) {
      return;
    }
    controller.abort();
    controllersRef.current.delete(itemId);
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    const controller = controllersRef.current.get(itemId);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(itemId);
    }

    setQueueItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleRetry = useCallback((itemId: string) => {
    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, status: 'pending', progress: null, errorMessage: null }
          : item,
      ),
    );
  }, []);

  const handleSubtitleFileChange = useCallback((file: File | null) => {
    setSubtitleFile(file);

    if (!activeItemId) {
      return;
    }

    setQueueItems((prev) =>
      prev.map((item) =>
        item.id === activeItemId
          ? { ...item, subtitleFile: file }
          : item,
      ),
    );
  }, [activeItemId]);

  const handleStartQueue = useCallback(() => {
    const readyItems = queueItemsRef.current.filter(
      (item) => item.status === 'pending' && item.omdbMovie,
    );

    if (readyItems.length === 0) {
      const firstNeedingLink = queueItemsRef.current.find(
        (item) => item.status === 'pending' && !item.omdbMovie,
      );
      if (firstNeedingLink) {
        setActiveItemId(firstNeedingLink.id);
      }
      return;
    }

    setAutoUpload(true);
  }, []);

  useEffect(() => {
    if (!autoUpload) {
      return;
    }

    const isUploading = queueItems.some((item) => item.status === 'uploading');
    if (isUploading) {
      return;
    }

    const nextItem = queueItems.find((item) => item.status === 'pending' && item.omdbMovie);
    if (!nextItem) {
      setAutoUpload(false);
      return;
    }

    void startUpload(nextItem.id);
  }, [autoUpload, queueItems, startUpload]);

  const queryIsActive = debouncedQuery.trim().length >= 2;
  const canSearchOmdb = Boolean(activeItem && canLinkMetadata(activeItem.status));

  const {
    data: searchData,
    isLoading: searchLoading,
    error: searchError,
  } = useMovies({ title: debouncedQuery, page: 1 }, queryIsActive && canSearchOmdb);

  const omdbResults = useMemo<OmdbSearchResult[]>(() => {
    if (!queryIsActive || !canSearchOmdb) {
      return [];
    }

    const rawResults = (searchData as { Search?: OmdbSearchResult[] } | undefined)?.Search;
    if (!Array.isArray(rawResults)) {
      return [];
    }

    return rawResults.slice(0, 8);
  }, [canSearchOmdb, queryIsActive, searchData]);

  const omdbResponseError = useMemo(() => {
    if (!canSearchOmdb || !queryIsActive || searchLoading) {
      return undefined;
    }

    const response = searchData as { Response?: string; Error?: string } | undefined;
    if (response?.Response === 'False' && response.Error) {
      return response.Error;
    }

    if (!searchLoading && omdbResults.length === 0 && !response?.Error) {
      return 'No matching titles found. Try refining your search.';
    }

    return undefined;
  }, [canSearchOmdb, omdbResults.length, queryIsActive, searchData, searchLoading]);

  const readyCount = queueItems.filter((item) => item.status === 'pending' && item.omdbMovie).length;
  const pendingWithoutMetadata = queueItems.filter(
    (item) => item.status === 'pending' && !item.omdbMovie,
  ).length;
  const anyUploading = queueItems.some((item) => item.status === 'uploading');

  const renderSearchResults = () => {
    if (!queueItems.length) {
      return (
        <Text size="xs" c="dimmed">
          Add files to the queue to link OMDb titles.
        </Text>
      );
    }

    if (!activeItem) {
      return null;
    }

    if (!canLinkMetadata(activeItem.status)) {
      return (
        <Alert
          color="yellow"
          variant="light"
          title="Metadata locked"
          icon={<IconInfoCircle size={16} />}
        >
          This upload has already started. Only pending items can be linked or relinked.
        </Alert>
      );
    }

    if (!queryIsActive) {
      return (
        <Text size="xs" c="dimmed">
          Type at least two characters to search the OMDb catalog.
        </Text>
      );
    }

    if (searchLoading) {
      return (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="xs" c="dimmed">
            Searching OMDb…
          </Text>
        </Group>
      );
    }

    if (searchError) {
      return (
        <Alert color="red" variant="light" title="Search failed" icon={<IconInfoCircle size={16} />}>
          {searchError instanceof Error
            ? searchError.message
            : 'Unable to search OMDb. Please try again later.'}
        </Alert>
      );
    }

    if (omdbResponseError) {
      return (
        <Alert color="yellow" variant="light" title="No results" icon={<IconInfoCircle size={16} />}>
          {omdbResponseError}
        </Alert>
      );
    }

    return (
      <Stack gap="xs">
        {omdbResults.map((movie) => {
          const isSelected = activeItem.omdbMovie?.imdbID === movie.imdbID;
          return (
            <Paper
              key={movie.imdbID}
              withBorder
              radius="md"
              p="sm"
              onClick={() => handleAssignActiveItem(movie)}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--mantine-color-blue-5)' : undefined,
                backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : undefined,
              }}
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600} size="sm">
                    {movie.Title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {movie.Year} • {movie.Type ? movie.Type.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Movie'}
                  </Text>
                </div>
                <Badge color={isSelected ? 'blue' : 'gray'} variant="light" size="xs">
                  {isSelected ? 'Linked' : 'Link'}
                </Badge>
              </Group>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  return (
    <Paper withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
            Upload
          </Text>
          <Title order={4}>Add Movies</Title>
          <Text size="sm" c="dimmed">
            Queue multiple video files, link them to the correct OMDb entries, and upload when ready.
          </Text>
        </Stack>

        {!isAuthenticated ? (
          <Stack gap="sm">
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} title="Authentication required">
              Sign in to upload new movies to the local library.
            </Alert>
            <Button fullWidth onClick={onRequestLogin} leftSection={<IconLogin size={16} />}>
              Login to upload
            </Button>
          </Stack>
        ) : (
          <Stack gap="lg">
            <Stack gap="xs">
              <FileInput
                label="Movie files"
                placeholder="Select one or more video files"
                accept="video/mp4,video/x-m4v,video/*"
                multiple
                value={fileInputValue ?? undefined}
                onChange={handleFilesSelected}
              />
              <Text size="xs" c="dimmed">
                Files stay in the queue so you can assign metadata and upload them in sequence.
              </Text>
            </Stack>

            {activeItem && canLinkMetadata(activeItem.status) && (
              <Stack gap="xs">
                <FileInput
                  label="Subtitle file (optional)"
                  placeholder="Select an SRT subtitle file"
                  accept=".srt"
                  value={subtitleFile ?? undefined}
                  onChange={handleSubtitleFileChange}
                  clearable
                />
                <Text size="xs" c="dimmed">
                  Optional: Upload an SRT file for {activeItem.file.name}, or we'll extract embedded subtitles automatically.
                </Text>
              </Stack>
            )}

            <Stack gap="lg">
              <Paper withBorder radius="lg" p={{ base: 'md', sm: 'lg' }}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Text fw={600} size="sm">
                        Upload queue
                      </Text>
                      <Text size="xs" c="dimmed">
                        {queueItems.length === 0
                          ? 'No files queued yet.'
                          : `${queueItems.length} file${queueItems.length === 1 ? '' : 's'} in queue.`}
                      </Text>
                    </Stack>
                    <Button
                      variant="light"
                      leftSection={<IconUpload size={16} />}
                      disabled={readyCount === 0}
                      loading={autoUpload && anyUploading}
                      onClick={handleStartQueue}
                    >
                      Start all
                    </Button>
                  </Group>

                  {pendingWithoutMetadata > 0 && (
                    <Alert
                      color="yellow"
                      variant="light"
                      icon={<IconInfoCircle size={16} />}
                      title="Metadata required"
                    >
                      Assign OMDb titles to {pendingWithoutMetadata} queued file{pendingWithoutMetadata === 1 ? '' : 's'} before uploading.
                    </Alert>
                  )}

                  {queueItems.length === 0 ? (
                    <Paper withBorder radius="md" p="md" ta="center">
                      <Text size="sm" c="dimmed">
                        Add files to build your upload queue.
                      </Text>
                    </Paper>
                  ) : (
                    <ScrollArea.Autosize mah={320} type="auto" offsetScrollbars>
                      <Stack gap="sm">
                        {queueItems.map((item) => {
                          const isActive = item.id === activeItemId;
                          const statusMeta = getStatusMeta(item);
                          const progressValue = item.progress ?? 0;
                          const progressLabel = (() => {
                            if (item.progress === null) {
                              return 'Uploading…';
                            }

                            if (item.progress >= 99) {
                              return 'Processing…';
                            }

                            return `Uploading… ${item.progress}%`;
                          })();
                          const showProgress = item.status === 'uploading';

                          return (
                            <Paper
                              key={item.id}
                              withBorder
                              radius="md"
                              p="sm"
                              onClick={() => setActiveItemId(item.id)}
                              style={{
                                cursor: 'pointer',
                                borderColor: isActive ? 'var(--mantine-color-blue-5)' : undefined,
                                backgroundColor: isActive ? 'var(--mantine-color-blue-light)' : undefined,
                              }}
                            >
                              <Stack gap="xs">
                                <Group justify="space-between" align="flex-start">
                                  <div>
                                    <Text fw={600} size="sm">
                                      {item.file.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {formatFileSize(item.file.size)}
                                    </Text>
                                  </div>
                                  <Badge color={statusMeta.color} variant="light" size="xs">
                                    {statusMeta.label}
                                  </Badge>
                                </Group>

                                <Text size="xs" c="dimmed">
                                  {item.omdbMovie
                                    ? `Linked to ${item.omdbMovie.Title}`
                                    : 'No OMDb title linked yet.'}
                                </Text>

                                {showProgress && (
                                  <Stack gap={4}>
                                    <Progress value={progressValue} animated striped aria-label="Upload progress" />
                                    <Text size="xs" c="dimmed">
                                      {progressLabel}
                                    </Text>
                                  </Stack>
                                )}

                                {item.status === 'success' && (
                                  <Text size="xs" c="teal">
                                    Upload complete.
                                  </Text>
                                )}

                                {item.errorMessage && (
                                  <Alert
                                    color={item.status === 'error' ? 'red' : 'yellow'}
                                    variant="light"
                                    icon={<IconInfoCircle size={16} />}
                                    title={item.status === 'error' ? 'Upload failed' : 'Upload canceled'}
                                  >
                                    {item.errorMessage}
                                  </Alert>
                                )}

                                <Group justify="flex-end" gap="xs">
                                  {canLinkMetadata(item.status) && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconLink size={14} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setActiveItemId(item.id);
                                      }}
                                    >
                                      {item.omdbMovie ? 'Relink' : 'Link OMDb'}
                                    </Button>
                                  )}

                                  {item.status === 'pending' && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconPlayerPlay size={14} />}
                                      disabled={!item.omdbMovie}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void startUpload(item.id);
                                      }}
                                    >
                                      Start
                                    </Button>
                                  )}

                                  {item.status === 'uploading' && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="red"
                                      leftSection={<IconX size={14} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleCancelUpload(item.id);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  )}

                                  {item.status === 'error' && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconRefresh size={14} />}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleRetry(item.id);
                                        void startUpload(item.id);
                                      }}
                                    >
                                      Retry
                                    </Button>
                                  )}

                                  <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleRemoveItem(item.id);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </Group>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </ScrollArea.Autosize>
                  )}
                </Stack>
              </Paper>

              <Paper
                withBorder
                radius="lg"
                p={{ base: 'md', sm: 'lg' }}
                style={{ position: 'sticky', top: 'var(--mantine-spacing-md)' }}
              >
                <Stack gap="md">
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      Link OMDb metadata
                    </Text>
                    <Text size="xs" c="dimmed">
                      Match each file with the correct OMDb entry before uploading.
                    </Text>
                  </Stack>

                  {activeItem ? (
                    <Paper withBorder radius="md" p="sm">
                      <Stack gap={4}>
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text fw={600} size="sm">
                              {activeItem.file.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatFileSize(activeItem.file.size)}
                            </Text>
                          </div>
                          <Badge color={getStatusMeta(activeItem).color} variant="light" size="xs">
                            {getStatusMeta(activeItem).label}
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {activeItem.omdbMovie
                            ? `Linked to ${activeItem.omdbMovie.Title}.`
                            : 'Not linked yet – search below to find the right title.'}
                        </Text>
                      </Stack>
                    </Paper>
                  ) : (
                    <Paper withBorder radius="md" p="sm">
                      <Text size="xs" c="dimmed">
                        Select a file from the queue to link metadata.
                      </Text>
                    </Paper>
                  )}

                  <TextInput
                    label={activeItem ? `Search OMDb for ${activeItem.file.name}` : 'Search OMDb'}
                    placeholder="Start typing a movie title"
                    leftSection={<IconMovie size={16} />}
                    value={query}
                    onChange={(event) => {
                      setUserEditedQuery(true);
                      setQuery(event.currentTarget.value);
                    }}
                    autoComplete="off"
                    disabled={!canSearchOmdb}
                  />
                  {renderSearchResults()}
                </Stack>
              </Paper>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
