import {
  Container,
  Grid,
  Stack,
  Text,
  Badge,
  Group,
  Paper,
  Button,
  ActionIcon,
  Divider,
  Title,
  Box,
  FileInput,
  Alert,
} from '@mantine/core';
import { IconArrowLeft, IconShare, IconSubtitles, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { VideoPlayer } from './VideoPlayer';
import type { Movie } from '../types';
import { uploadSubtitleToMovie } from '../api/uploads';

interface MovieWatchPageProps {
  movie: Movie;
  onBack?: () => void;
  onSubtitleUpload?: () => void;
}

export function MovieWatchPage({ movie, onBack, onSubtitleUpload }: MovieWatchPageProps) {
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const topCast = movie.cast.slice(0, 5);
  const remainingCast = movie.cast.length > 5 ? movie.cast.length - 5 : 0;

  const handleSubtitleUpload = async () => {
    if (!subtitleFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadSubtitleToMovie(movie.id, subtitleFile);
      setUploadSuccess(true);
      setSubtitleFile(null);

      // Reload the page after a short delay to show the new subtitle
      setTimeout(() => {
        onSubtitleUpload?.();
        window.location.reload();
      }, 1500);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload subtitle');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={onBack}
          >
            Back to Library
          </Button>
          <Group gap="sm">
            <ActionIcon variant="light" color="gray">
              <IconShare size={16} />
            </ActionIcon>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              <Paper p="xl" radius="lg" withBorder>
                {movie.hasVideo ? (
                  <VideoPlayer
                    movieId={movie.id}
                    hasSubtitles={movie.hasSubtitles}
                    availableQualities={movie.videoQualities}
                    defaultQuality={movie.videoQualities?.[0]}
                    autoPlay={false}
                  />
                ) : (
                  <Box
                    style={{
                      height: 400,
                      backgroundColor: '#f8f9fa',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text c="dimmed" size="lg">
                      Video not available
                    </Text>
                  </Box>
                )}
              </Paper>

              {movie.hasVideo && (
                <Paper p="md" radius="lg" withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <IconSubtitles size={20} />
                        <Text fw={600} size="sm">
                          Subtitle Management
                        </Text>
                      </Group>
                      {movie.hasSubtitles && (
                        <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12} />}>
                          Subtitles Available
                        </Badge>
                      )}
                    </Group>

                    {uploadSuccess && (
                      <Alert color="green" title="Success">
                        Subtitle uploaded successfully! Page will reload...
                      </Alert>
                    )}

                    {uploadError && (
                      <Alert color="red" title="Upload Failed">
                        {uploadError}
                      </Alert>
                    )}

                    <Group align="flex-end">
                      <FileInput
                        label={movie.hasSubtitles ? "Replace subtitle file" : "Upload subtitle file"}
                        placeholder="Select an SRT file"
                        accept=".srt"
                        value={subtitleFile}
                        onChange={setSubtitleFile}
                        style={{ flex: 1 }}
                        clearable
                      />
                      <Button
                        onClick={handleSubtitleUpload}
                        disabled={!subtitleFile}
                        loading={isUploading}
                        leftSection={<IconSubtitles size={16} />}
                      >
                        Upload
                      </Button>
                    </Group>

                    <Text size="xs" c="dimmed">
                      {movie.hasSubtitles
                        ? "Upload a new SRT file to replace the current subtitles."
                        : "Upload an SRT subtitle file for this movie."}
                    </Text>
                  </Stack>
                </Paper>
              )}

              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs">
                    <Title order={1} size="h2">
                      {movie.title}
                    </Title>
                    <Text c="dimmed" size="lg">
                      {movie.year} • {movie.duration} min
                    </Text>
                  </Stack>
                  <Badge color="yellow" variant="light" size="lg">
                    ⭐ {movie.rating.toFixed(1)} / 10
                  </Badge>
                </Group>

                <Group gap="xs">
                  {movie.genre.map((genre) => (
                    <Badge key={genre} variant="light" color="cyan">
                      {genre}
                    </Badge>
                  ))}
                  <Badge
                    color={movie.available ? 'teal' : 'grape'}
                    variant="filled"
                  >
                    {movie.available ? 'Available' : 'Coming Soon'}
                  </Badge>
                  {movie.hasVideo && (
                    <Badge color="blue" variant="light">
                      {movie.videoFormat || 'MP4'}
                    </Badge>
                  )}
                </Group>

                <Text size="lg" lh={1.6}>
                  {movie.description}
                </Text>
              </Stack>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              <Paper p="lg" radius="lg" withBorder>
                <Stack gap="md">
                  <Title order={3} size="h4">
                    Movie Details
                  </Title>

                  <Divider />

                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text c="dimmed">Director</Text>
                      <Text fw={500}>{movie.director}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text c="dimmed">Release Year</Text>
                      <Text fw={500}>{movie.year}</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text c="dimmed">Duration</Text>
                      <Text fw={500}>{movie.duration} min</Text>
                    </Group>

                    <Group justify="space-between">
                      <Text c="dimmed">Rating</Text>
                      <Text fw={500}>{movie.rating.toFixed(1)}/10</Text>
                    </Group>

                    {movie.fileSize && (
                      <Group justify="space-between">
                        <Text c="dimmed">File Size</Text>
                        <Text fw={500}>
                          {(movie.fileSize / (1024 * 1024 * 1024)).toFixed(1)} GB
                        </Text>
                      </Group>
                    )}

                    {movie.videoQualities && movie.videoQualities.length > 0 && (
                      <Group justify="space-between">
                        <Text c="dimmed">Available Qualities</Text>
                        <Text fw={500}>{movie.videoQualities.join(', ')}</Text>
                      </Group>
                    )}
                  </Stack>
                </Stack>
              </Paper>

              <Paper p="lg" radius="lg" withBorder>
                <Stack gap="md">
                  <Title order={3} size="h4">
                    Cast
                  </Title>

                  <Divider />

                  <Stack gap="xs">
                    {topCast.map((actor, index) => (
                      <Text key={index} size="sm">
                        {actor}
                      </Text>
                    ))}
                    {remainingCast > 0 && (
                      <Text size="sm" c="dimmed">
                        and {remainingCast} more...
                      </Text>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
