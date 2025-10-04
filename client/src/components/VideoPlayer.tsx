import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, LoadingOverlay, Select, Stack, Text } from '@mantine/core';
import { streamingService } from '../api/streaming';

interface VideoPlayerProps {
  movieId: string;
  autoPlay?: boolean;
  availableQualities?: string[];
  defaultQuality?: string;
}

export function VideoPlayer({
  movieId,
  autoPlay = false,
  availableQualities = ['1080p'],
  defaultQuality,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qualityOptions = useMemo(
    () => availableQualities.filter((quality) => Boolean(quality?.trim())),
    [availableQualities],
  );

  const preferredQuality = useMemo(() => {
    if (!qualityOptions.length) {
      return '';
    }
    if (defaultQuality && qualityOptions.includes(defaultQuality)) {
      return defaultQuality;
    }
    return qualityOptions[0];
  }, [defaultQuality, qualityOptions]);

  const [selectedQuality, setSelectedQuality] = useState<string>(preferredQuality);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qualityOptions.length) {
      if (selectedQuality !== '') {
        setSelectedQuality('');
      }
      return;
    }

    if (!selectedQuality || !qualityOptions.includes(selectedQuality)) {
      setSelectedQuality(preferredQuality);
    }
  }, [preferredQuality, qualityOptions, selectedQuality]);

  const streamUrl = useMemo(() => {
    if (!movieId) {
      return null;
    }

    if (selectedQuality) {
      return streamingService.getMovieStreamUrl(movieId, { quality: selectedQuality });
    }

    return streamingService.getMovieStreamUrl(movieId);
  }, [movieId, selectedQuality]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [streamUrl]);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const playWhenReady = () => {
      video.play().catch(() => undefined);
    };

    video.addEventListener('canplay', playWhenReady);
    return () => {
      video.removeEventListener('canplay', playWhenReady);
    };
  }, [autoPlay, streamUrl]);

  const handleVideoReady = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setError('Unable to load the video stream. Please try again.');
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    videoRef.current?.load();
  };

  const showQualitySelect = qualityOptions.length > 1;

  return (
    <Stack gap="sm">
      {error && (
        <Alert color="red" title="Playback error">
          {error}
          <Button variant="light" size="xs" mt="sm" onClick={handleRetry}>
            Retry
          </Button>
        </Alert>
      )}

      {showQualitySelect && (
        <Select
          label="Quality"
          value={selectedQuality}
          onChange={(value) => value && setSelectedQuality(value)}
          data={qualityOptions}
          size="sm"
          w={160}
        />
      )}

      <Box pos="relative" bg="black" style={{ borderRadius: 8, overflow: 'hidden' }}>
        <LoadingOverlay visible={isLoading && !error} />

        {streamUrl ? (
          <video
            key={streamUrl}
            ref={videoRef}
            src={streamUrl}
            controls
            playsInline
            autoPlay={autoPlay}
            style={{ width: '100%', display: 'block' }}
            onLoadedData={handleVideoReady}
            onLoadedMetadata={handleVideoReady}
            onCanPlay={handleVideoReady}
            onError={handleVideoError}
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <Box p="xl">
            <Text c="dimmed" ta="center">
              Video stream unavailable.
            </Text>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
