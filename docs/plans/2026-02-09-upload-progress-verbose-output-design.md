# Upload Progress & Verbose Output Design

**Date:** 2026-02-09
**Status:** Approved
**Estimated Effort:** 3-4 days development + 1 day testing

## Overview

Implement real-time progress tracking and verbose output for movie uploads and processing. Users will see detailed information about upload progress, codec detection, transcoding metrics (fps, bitrate, ETA), subtitle processing, and storage upload stages.

## Architecture

### Communication Method: Server-Sent Events (SSE)

**Upload Flow:**
1. Client uploads file via XHR with progress tracking (0-99%)
2. Server responds immediately with `uploadId`
3. Client opens SSE connection: `GET /movies/upload/:uploadId/progress`
4. Server processes upload asynchronously, streaming progress events
5. Client displays real-time updates for each processing stage
6. SSE connection closes on completion/error

**Processing Stages:**
1. **Upload Complete** - File received by server
2. **Codec Detection** - ffprobe analysis of video/audio codecs
3. **Video Transcoding** - ffmpeg conversion with real-time metrics
4. **Subtitle Processing** - Extraction or upload
5. **Storage Upload** - MinIO transfer
6. **Database Save** - Metadata persistence
7. **Complete** - Final movie record returned

## Data Structures

### TypeScript Types

```typescript
type ProgressEventType =
  | 'upload_complete'
  | 'codec_detection'
  | 'transcoding'
  | 'subtitle_processing'
  | 'storage_upload'
  | 'database_save'
  | 'complete'
  | 'error';

interface BaseProgressEvent {
  uploadId: string;
  type: ProgressEventType;
  timestamp: number;
}

interface UploadCompleteEvent extends BaseProgressEvent {
  type: 'upload_complete';
  fileSize: number;
  fileName: string;
}

interface CodecDetectionEvent extends BaseProgressEvent {
  type: 'codec_detection';
  videoCodec: string;
  audioCodec: string;
  strategy: { videoAction: 'copy' | 'transcode'; audioAction: 'copy' | 'transcode' };
  hwAcceleration?: string; // 'h264_vaapi', 'h264_qsv', etc.
}

interface TranscodingProgressEvent extends BaseProgressEvent {
  type: 'transcoding';
  progress: number; // 0-100
  fps?: number;
  bitrate?: string; // "2.1 Mb/s"
  speed?: string; // "1.2x"
  timeProcessed?: string; // "00:05:32"
  totalDuration?: string; // "01:45:20"
  estimatedTimeRemaining?: number; // seconds
  inputSize: number;
  estimatedOutputSize?: number;
}

interface SubtitleProcessingEvent extends BaseProgressEvent {
  type: 'subtitle_processing';
  action: 'uploading' | 'extracting' | 'none';
  language?: string;
  streamIndex?: number;
}

interface StorageUploadEvent extends BaseProgressEvent {
  type: 'storage_upload';
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
}

interface CompleteEvent extends BaseProgressEvent {
  type: 'complete';
  movie: UploadedMovieRecord;
}

interface ErrorEvent extends BaseProgressEvent {
  type: 'error';
  message: string;
  stage: string;
}

type ProgressEvent =
  | UploadCompleteEvent
  | CodecDetectionEvent
  | TranscodingProgressEvent
  | SubtitleProcessingEvent
  | StorageUploadEvent
  | CompleteEvent
  | ErrorEvent;
```

### Server Progress State

```typescript
interface UploadProgress {
  uploadId: string;
  status: 'processing' | 'complete' | 'error';
  currentStage: string;
  events: ProgressEvent[];
  createdAt: number;
  lastUpdatedAt: number;
}
```

## Server Implementation

### New Files

**`server/src/progress/progress.service.ts`**
- Manages upload progress state in-memory
- Provides Observable streams for SSE
- TTL-based cleanup (5 minutes after completion)
- Methods: `createUpload()`, `emitEvent()`, `getEventStream()`, `completeUpload()`

**`server/src/progress/progress.controller.ts`**
- SSE endpoint: `GET /movies/upload/:uploadId/progress`
- Streams progress events as Server-Sent Events
- Uses `@Sse()` decorator with Observable

**`server/src/progress/progress.module.ts`**
- Module definition
- Exports ProgressService for injection

### Modified Files

**`server/src/movies/movies.controller.ts`**
- Upload endpoint returns `{ uploadId: string }` instead of full movie record
- Processing happens asynchronously

**`server/src/movies/movies.service.ts`**
- `uploadMovie()` generates uploadId and returns immediately
- New `processUpload()` method handles async processing
- Emits progress events at each stage
- Integrates with ProgressService
- Enhanced error handling with cleanup

**`server/src/ffmpeg/ffmpeg.service.ts`**
- New `getTotalDuration()` method using ffprobe
- New `parseFfmpegProgress()` method to extract metrics from stderr
- New `timeToSeconds()` helper for time conversion
- `convertToFastStart()` accepts `FfmpegOptions` with `onProgress` callback
- Real-time stderr parsing for progress updates

### FFmpeg Progress Parsing

FFmpeg outputs progress to stderr:
```
frame=  450 fps= 38 q=28.0 size=   12800kB time=00:00:18.75 bitrate=5589.3kbits/s speed=1.58x
```

Parsing logic extracts:
- Frame number
- FPS (encoding speed)
- Bitrate
- Time processed (HH:MM:SS.MS)
- Speed multiplier
- Progress percentage (calculated from time processed / total duration)

### Progress Service Architecture

```typescript
@Injectable()
export class ProgressService {
  private uploads = new Map<string, UploadProgress>();
  private clients = new Map<string, Subject<ProgressEvent>>();

  createUpload(uploadId: string): void;
  emitEvent(uploadId: string, event: ProgressEvent): void;
  getEventStream(uploadId: string): Observable<ProgressEvent>;
  completeUpload(uploadId: string): void;
  private cleanup(uploadId: string): void;
}
```

## Client Implementation

### New Files

**`client/src/api/uploadProgress.ts`**
- `UploadProgressStream` class wraps EventSource
- Handles SSE connection, reconnection (max 5 attempts)
- Type-safe event parsing
- Automatic cleanup on complete/error

### Modified Files

**`client/src/api/uploads.ts`**
- `uploadMovie()` returns `{ uploadId: string }`
- XHR progress tracks upload phase (0-99%)

**`client/src/components/MovieUploadSection.tsx`**
- Queue item extended with:
  - `uploadProgress: number | null` (0-99 for upload)
  - `processingStage: string | null`
  - `processingDetails: string | null`
  - `progressStream: UploadProgressStream | null`
- New handlers: `handleProgressEvent()`, `handleProgressError()`, `handleProgressComplete()`
- Cleanup on unmount and browser close
- Warning prompt if uploads in progress

**`client/src/types/movie.ts`**
- Add all ProgressEvent type definitions

## UI Display

### Progress Card Layout

```
┌─────────────────────────────────────────────────────┐
│ movie-file.mp4                          [Uploading] │
│ 4.2 GB                                              │
│                                                     │
│ [████████████████░░░░░░░░] 75%                     │
│ Uploading to server... 75%                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ movie-file.mp4                        [Processing]  │
│ 4.2 GB                                              │
│                                                     │
│ [████████████████████░░░░] 85%                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ⚙️ Transcoding Video                            │ │
│ │ Transcoding: 85% | Speed: 38.5 fps (1.2x) |    │ │
│ │ Bitrate: 2.1 Mb/s | 01:12:45/01:25:30 |         │ │
│ │ Input: 4.2GB → Output: ~1.8GB | ETA: 3 min     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Show Details ▼]                                    │
└─────────────────────────────────────────────────────┘
```

### Verbose Details Display

- **Codec Detection:** "Detected codecs: hevc (transcode), eac3 (transcode) | HW Accel: h264_vaapi"
- **Transcoding:** Full metrics as shown above
- **Subtitle Processing:** "Extracting subtitle stream 3 (eng)" or "Processing uploaded subtitle..."
- **Storage Upload:** "Uploading to storage: 45% (850/1890 MB)"
- **Database Save:** "Saving metadata to database..."

### Optional Expandable View

Shows raw event log in monospace font for debugging:
```
[14:32:15] upload_complete: { fileSize: 4412341248, fileName: "movie.mkv" }
[14:32:16] codec_detection: { videoCodec: "hevc", audioCodec: "eac3", ... }
[14:32:18] transcoding: { progress: 5, fps: 42.3, ... }
```

## Error Handling

### Server-Side

1. **Processing Timeout:** 1-hour timeout with automatic cleanup
2. **FFmpeg Failures:** Catch spawn errors, parse stderr for error details
3. **MinIO Failures:** Rollback uploaded files on error
4. **Stage-Specific Error Messages:** Contextual hints for each stage
5. **Cleanup on Failure:** Remove partial uploads from MinIO

### Client-Side

1. **SSE Reconnection:** Auto-retry up to 5 times with exponential backoff
2. **Network Disconnection:** Graceful error display
3. **Browser Refresh Warning:** Prompt if uploads in progress
4. **Component Unmount:** Close all active SSE streams
5. **Error Display:** Show formatted error messages with stage context

### Edge Cases

- ✅ Duplicate upload IDs (UUID prevents collisions)
- ✅ Orphaned progress entries (TTL cleanup after 5 minutes)
- ✅ Browser refresh during processing (warning + stream cleanup)
- ✅ Network interruption (SSE reconnection)
- ✅ Multiple simultaneous uploads (independent streams)
- ✅ FFmpeg crash (error event with stage info)
- ✅ Corrupt video files (validation before processing)

## Testing Strategy

### Unit Tests

- `ProgressService`: Event emission, stream management, cleanup
- `FfmpegService`: Progress parsing, duration calculation, ETA estimation
- Client `UploadProgressStream`: Event parsing, reconnection logic

### Integration Tests

- E2E upload flow with SSE streaming
- Multiple concurrent uploads
- Error scenarios (corrupt files, network failures)
- Timeout handling

### Manual Testing Checklist

1. ✅ Small video (< 100MB) - all stages complete quickly
2. ✅ Large video (> 1GB) - smooth progress updates
3. ✅ HEVC/AV1 video requiring transcoding - ffmpeg metrics display
4. ✅ Video with embedded subtitles - extraction progress
5. ✅ Video with separate subtitle file - upload stage
6. ✅ Cancel upload mid-transfer - cleanup verification
7. ✅ Network disconnect during processing - SSE reconnection
8. ✅ Browser refresh during upload - warning prompt
9. ✅ Queue multiple uploads - sequential processing
10. ✅ Corrupt file - error reporting

## Implementation Order

### Phase 1: Server Foundation (Day 1-2)

1. Create `ProgressService` with SSE support
2. Add FFmpeg progress parsing to `FfmpegService`
3. Modify `MoviesService` for async processing
4. Create `ProgressController` with SSE endpoint
5. Add `ProgressModule` to `AppModule`

### Phase 2: Client Integration (Day 2-3)

1. Create `UploadProgressStream` class
2. Modify upload API to handle `uploadId` response
3. Update `MovieUploadSection` state management
4. Add progress event handlers
5. Implement SSE connection lifecycle

### Phase 3: UI Enhancements (Day 3)

1. Add verbose progress display components
2. Style progress cards with monospace fonts
3. Format stage names with emojis/icons
4. Add optional expandable detail view
5. Implement cleanup handlers

### Phase 4: Testing & Refinement (Day 4)

1. Unit tests for `ProgressService` and FFmpeg parsing
2. E2E tests for full upload flow
3. Manual testing with various video formats
4. Performance tuning for large files
5. Browser compatibility testing

## Files to Create

```
server/src/progress/
├── progress.service.ts
├── progress.controller.ts
├── progress.module.ts
└── progress.service.spec.ts

client/src/api/
└── uploadProgress.ts

server/test/
└── upload-progress.e2e-spec.ts

docs/plans/
└── 2026-02-09-upload-progress-verbose-output-design.md
```

## Files to Modify

```
server/src/movies/movies.controller.ts
server/src/movies/movies.service.ts
server/src/ffmpeg/ffmpeg.service.ts
client/src/api/uploads.ts
client/src/components/MovieUploadSection.tsx
client/src/types/movie.ts
server/src/app.module.ts
```

## Dependencies

```json
{
  "dependencies": {
    "rxjs": "^7.8.1"  // For Observable/Subject (likely already installed)
  }
}
```

## Configuration

```env
# server/.env
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
STREAM_CHUNK_SIZE=1048576
```

## Key Technical Details

- **SSE Format:** `data: {...}\ntype: transcoding\n\n`
- **Progress Cleanup:** 5-minute TTL after completion
- **FFmpeg Parsing:** Line-by-line stderr parsing in real-time
- **HW Acceleration:** Detected during codec detection stage
- **ETA Calculation:** Linear extrapolation from current progress rate
- **File Sizes:** Human-readable format (MB/GB)
- **Timestamps:** Unix milliseconds
- **Browser Support:** Modern browsers with EventSource API

## Performance Considerations

- In-memory progress store (no database overhead)
- Efficient FFmpeg stderr parsing (regex-based)
- SSE connection reuse (one connection per upload)
- Cleanup prevents memory leaks
- Hardware acceleration reduces transcoding time by 10x

## Success Metrics

- ✅ Users can see upload progress percentage (0-99%)
- ✅ Users can see detailed transcoding metrics (fps, bitrate, ETA)
- ✅ Users can see which codec and hardware acceleration is used
- ✅ Users can see estimated output file size during transcoding
- ✅ Users can see subtitle extraction/upload progress
- ✅ Progress updates in real-time (< 1 second latency)
- ✅ Errors display with helpful context about which stage failed
- ✅ No orphaned resources (automatic cleanup)
- ✅ System handles multiple concurrent uploads gracefully

---

**Design Status:** ✅ Approved
**Ready for Implementation:** Yes
**Estimated Completion:** 4-5 days
