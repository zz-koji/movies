const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export interface UploadMovieParams {
  file: File;
  omdbId: string;
  onProgress?: (progress: number | null) => void;
  signal?: AbortSignal;
}

export interface UploadedMovieRecord {
  id: string;
  title: string;
  description: string;
  movie_file_key: string;
  subtitle_file_key?: string | null;
  omdb_id: string;
}

export interface UploadMovieResponse {
  upload: unknown;
  movie: UploadedMovieRecord;
}

export async function uploadMovie({ file, omdbId, onProgress, signal }: UploadMovieParams): Promise<UploadMovieResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL}/movies/upload?omdb_id=${encodeURIComponent(omdbId)}`;

  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.withCredentials = true;

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    const handleAbort = () => {
      xhr.abort();
      cleanup();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    xhr.upload.onloadstart = () => {
      onProgress?.(0);
    };

    xhr.upload.onprogress = (event) => {
      if (!onProgress) {
        return;
      }

      if (event.lengthComputable && event.total > 0) {
        const rawPercent = Math.round((event.loaded / event.total) * 100);
        const percent = Math.min(99, rawPercent);
        onProgress(percent);
      } else {
        onProgress(null);
      }
    };

    xhr.upload.onerror = () => {
      onProgress?.(null);
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Failed to upload movie.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    xhr.onload = () => {
      cleanup();

      const status = xhr.status;
      const isSuccess = status >= 200 && status < 300;

      const parseResponse = () => {
        const type = xhr.responseType;

        if (type && type !== 'text') {
          return xhr.response;
        }

        const raw = xhr.response;
        const rawText = typeof raw === 'string' ? raw : '';
        if (rawText.trim().length === 0) {
          return null;
        }

        try {
          return JSON.parse(rawText);
        } catch {
          return rawText;
        }
      };

      const parsed = parseResponse();

      if (isSuccess) {
        onProgress?.(100);
        if (parsed && typeof parsed === 'object') {
          resolve(parsed as UploadMovieResponse);
          return;
        }

        reject(new Error('Upload succeeded but returned invalid response.'));
        return;
      }

      let message = 'Failed to upload movie.';
      if (parsed && typeof (parsed as { message?: unknown }).message === 'string') {
        const candidate = (parsed as { message: string }).message.trim();
        if (candidate.length > 0) {
          message = candidate;
        }
      } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
        message = parsed.trim();
      }

      reject(new Error(message));
    };

    xhr.send(formData);
  });
}
