const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface StreamingService {
  getMovieStreamUrl(movieId: string): string;
  getMovieStreamUrlWithQuality(movieId: string, quality: string): string;
}

class ApiStreamingService implements StreamingService {
  constructor(private readonly baseUrl: string) { }

  private buildStreamPath(movieId: string, quality?: string): string {
    const params = new URLSearchParams({ omdb_id: movieId });
    if (quality) {
      params.set('quality', quality);
    }
    return `${this.baseUrl}/movies/stream?${params.toString()}`;
  }

  getMovieStreamUrl(movieId: string): string {
    return this.buildStreamPath(movieId);
  }

  getMovieStreamUrlWithQuality(movieId: string, quality: string): string {
    return this.buildStreamPath(movieId, quality);
  }
}

export const streamingService: StreamingService = new ApiStreamingService(API_BASE_URL);

export type { StreamingService };
