interface StreamResponse {
  streamUrl: string;
  expiresIn: number;
}

interface StreamingService {
  getMovieStreamUrl(movieId: string): Promise<string>;
  getMovieStreamUrlWithQuality(movieId: string, quality: string): Promise<string>;
}

class ApiStreamingService implements StreamingService {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async getMovieStreamUrl(movieId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/movies/${movieId}/stream`);

    if (!response.ok) {
      throw new Error(`Failed to get stream URL: ${response.statusText}`);
    }

    const data: StreamResponse = await response.json();
    return data.streamUrl;
  }

  async getMovieStreamUrlWithQuality(movieId: string, quality: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/movies/${movieId}/stream/${quality}`);

    if (!response.ok) {
      throw new Error(`Failed to get stream URL for quality ${quality}: ${response.statusText}`);
    }

    const data: StreamResponse = await response.json();
    return data.streamUrl;
  }
}

class MockStreamingService implements StreamingService {
  async getMovieStreamUrl(movieId: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `https://sample-videos.com/zip/10/mp4/mp4/SampleVideo_1280x720_1mb.mp4?movieId=${movieId}`;
  }

  async getMovieStreamUrlWithQuality(movieId: string, quality: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `https://sample-videos.com/zip/10/mp4/mp4/SampleVideo_1280x720_1mb.mp4?movieId=${movieId}&quality=${quality}`;
  }
}

export const streamingService: StreamingService = process.env.NODE_ENV === 'development'
  ? new MockStreamingService()
  : new ApiStreamingService();

export type { StreamingService, StreamResponse };