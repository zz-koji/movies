const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface StreamOptions {
  quality?: string;
}

interface StreamingService {
  getMovieStreamUrl(movieId: string, options?: StreamOptions): string;
}

class ApiStreamingService implements StreamingService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getMovieStreamUrl(movieId: string, options?: StreamOptions): string {
    const params = new URLSearchParams({ omdb_id: movieId });
    if (options?.quality) {
      params.set('quality', options.quality);
    }
    return `${this.baseUrl}/movies/stream?${params.toString()}`;
  }
}

export const streamingService: StreamingService = new ApiStreamingService(API_BASE_URL);

export type { StreamOptions, StreamingService };
