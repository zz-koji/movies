import { useState, useRef, useEffect } from 'react';
import { Box, LoadingOverlay, Alert, Group, Button, Select } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { streamingService } from '../api/streaming';

interface VideoPlayerProps {
  movieId: string;
  movieTitle: string;
  autoPlay?: boolean;
  availableQualities?: string[];
  defaultQuality?: string;
}

export function VideoPlayer({
  movieId,
  autoPlay = false,
  availableQualities = ['1080p'],
  defaultQuality = '1080p'
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(defaultQuality);

  const loadVideo = async (quality: string) => {
    try {
      setLoading(true);
      setError(null);

      const url = availableQualities.includes(quality)
        ? await streamingService.getMovieStreamUrlWithQuality(movieId, quality)
        : await streamingService.getMovieStreamUrl(movieId);

      setStreamUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideo(selectedQuality);
  }, [movieId, selectedQuality]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setLoading(false);
      if (autoPlay) {
        video.play().catch(console.error);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError('Error loading video. Please try again.');
      setLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, [autoPlay]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleQualityChange = (value: string | null) => {
    if (value && availableQualities.includes(value)) {
      setSelectedQuality(value);
    }
  };

  if (error) {
    return (
      <Alert color="red" title="Video Error">
        {error}
        <Button
          variant="light"
          size="sm"
          mt="sm"
          onClick={() => loadVideo(selectedQuality)}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} />

      {availableQualities.length > 1 && (
        <Group mb="sm">
          <Select
            label="Quality"
            value={selectedQuality}
            onChange={handleQualityChange}
            data={availableQualities}
            size="sm"
            w={120}
          />
        </Group>
      )}

      <Box
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            preload="metadata"
            playsInline
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        )}

        <Group
          gap="xs"
          p="sm"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            opacity: 0,
            transition: 'opacity 0.3s ease'
          }}
          className="video-controls"
        >
          <Button
            variant="subtle"
            size="sm"
            onClick={togglePlayPause}
            color="white"
          >
            {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
          </Button>

          <Button
            variant="subtle"
            size="sm"
            onClick={toggleMute}
            color="white"
          >
            {isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
          </Button>
        </Group>
      </Box>

      <style>{`
        .video-controls:hover {
          opacity: 1 !important;
        }
      `}</style>
    </Box>
  );
}