import { useState, useRef, useEffect } from 'react';
import { Box, LoadingOverlay, Alert, Group, Button, Select, Slider, Text } from '@mantine/core';
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
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const isScrubbingRef = useRef(false);

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return '0:00';
    }

    const rounded = Math.floor(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideo(selectedQuality);
  }, [movieId, selectedQuality]);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    video.load();

    if (typeof HTMLMediaElement !== 'undefined' && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setLoading(false);
    }
  }, [streamUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setLoading(false);
    };

    const handleLoadedData = () => {
      setLoading(false);
      setDuration(video.duration || 0);
      if (autoPlay) {
        video.play().catch(console.error);
      }
    };

    const handleCanPlay = () => setLoading(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setProgress(video.currentTime);
      }
    };
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleError = () => {
      setError('Error loading video. Please try again.');
      setLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('error', handleError);
    };
  }, [autoPlay, streamUrl]);

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

  const handleSliderChange = (value: number) => {
    isScrubbingRef.current = true;
    setProgress(value);
  };

  const handleSliderChangeEnd = (value: number) => {
    const video = videoRef.current;
    if (!video) {
      isScrubbingRef.current = false;
      return;
    }

    video.currentTime = value;
    setProgress(value);
    isScrubbingRef.current = false;
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
        className="video-container"
      >
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            preload="auto"
            playsInline
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        )}

        <Box
          p="sm"
          className="video-controls"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <Slider
            value={duration ? Math.min(progress, duration) : 0}
            onChange={handleSliderChange}
            onChangeEnd={handleSliderChangeEnd}
            min={0}
            max={duration || 1}
            step={0.1}
            label={(value) => formatTime(value)}
            disabled={!duration}
            styles={{
              track: { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              bar: { backgroundColor: '#fff' },
              thumb: { borderWidth: 2, borderColor: '#fff', backgroundColor: '#1a1b1e' }
            }}
          />

          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
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

            <Text size="xs" c="white" style={{ whiteSpace: 'nowrap' }}>
              {formatTime(progress)} / {formatTime(duration)}
            </Text>
          </Group>
        </Box>
      </Box>

      <style>{`
        .video-container:hover .video-controls,
        .video-container:focus-within .video-controls {
          opacity: 1 !important;
        }

        .video-controls:hover {
          opacity: 1 !important;
        }
      `}</style>
    </Box>
  );
}
