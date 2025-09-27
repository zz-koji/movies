# NestJS + MinIO Server Implementation Guide

## Overview
This guide covers implementing a NestJS backend with MinIO object storage for movie streaming using presigned URLs (Option A approach).

## Prerequisites
- NestJS application setup
- MinIO server running (locally or remote)
- MinIO bucket created for movie storage

## 1. Dependencies Installation

```bash
npm install minio @nestjs/config
npm install --save-dev @types/minio
```

## 2. Environment Configuration

Create `.env` file:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=movies-bucket
```

## 3. MinIO Service Implementation

```typescript
// src/minio/minio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME');
    this.minioClient = new Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT'),
      port: parseInt(this.configService.get<string>('MINIO_PORT')),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY'),
    });
  }

  async generatePresignedUrl(
    objectName: string,
    expiry: number = 24 * 60 * 60
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        objectName,
        expiry
      );
    } catch (error) {
      this.logger.error(`Error generating presigned URL for ${objectName}:`, error);
      throw error;
    }
  }

  async checkObjectExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async uploadFile(objectName: string, filePath: string): Promise<void> {
    try {
      await this.minioClient.fPutObject(this.bucketName, objectName, filePath);
      this.logger.log(`Successfully uploaded ${objectName}`);
    } catch (error) {
      this.logger.error(`Error uploading ${objectName}:`, error);
      throw error;
    }
  }
}
```

## 4. Movies Controller Implementation

```typescript
// src/movies/movies.controller.ts
import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Request
} from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { MoviesService } from './movies.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // If using auth

@Controller('movies')
export class MoviesController {
  constructor(
    private readonly minioService: MinioService,
    private readonly moviesService: MoviesService
  ) {}

  @Get(':id/stream')
  // @UseGuards(JwtAuthGuard) // Uncomment if using authentication
  async getMovieStreamUrl(
    @Param('id') movieId: string,
    // @Request() req // Uncomment if using authentication
  ): Promise<{ streamUrl: string; expiresIn: number }> {
    // Check if movie exists in your database
    const movie = await this.moviesService.findById(movieId);
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    // Check if video file exists in MinIO
    const objectName = `${movieId}/video.mp4`;
    const exists = await this.minioService.checkObjectExists(objectName);
    if (!exists) {
      throw new NotFoundException('Video file not found');
    }

    // Generate presigned URL (1 hour expiry)
    const expiry = 3600; // 1 hour in seconds
    const streamUrl = await this.minioService.generatePresignedUrl(objectName, expiry);

    return {
      streamUrl,
      expiresIn: expiry
    };
  }

  @Get(':id/stream/:quality')
  // @UseGuards(JwtAuthGuard)
  async getMovieStreamUrlWithQuality(
    @Param('id') movieId: string,
    @Param('quality') quality: string
  ): Promise<{ streamUrl: string; expiresIn: number }> {
    const validQualities = ['480p', '720p', '1080p', '4k'];
    if (!validQualities.includes(quality)) {
      throw new NotFoundException('Invalid quality option');
    }

    const movie = await this.moviesService.findById(movieId);
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const objectName = `${movieId}/${quality}.mp4`;
    const exists = await this.minioService.checkObjectExists(objectName);
    if (!exists) {
      throw new NotFoundException(`Video file not found for quality: ${quality}`);
    }

    const expiry = 3600;
    const streamUrl = await this.minioService.generatePresignedUrl(objectName, expiry);

    return {
      streamUrl,
      expiresIn: expiry
    };
  }
}
```

## 5. Module Setup

```typescript
// src/minio/minio.module.ts
import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';

@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}

// src/movies/movies.module.ts
import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
```

## 6. MinIO Bucket Structure

Organize your MinIO bucket like this:
```
movies-bucket/
├── movie-1/
│   ├── video.mp4
│   ├── 480p.mp4
│   ├── 720p.mp4
│   ├── 1080p.mp4
│   └── poster.jpg
├── movie-2/
│   ├── video.mp4
│   └── poster.jpg
└── ...
```

## 7. Frontend Integration

Your React app will call these endpoints:

```typescript
// Get movie stream URL
const response = await fetch(`/api/movies/${movieId}/stream`);
const { streamUrl, expiresIn } = await response.json();

// Use in video element
<video src={streamUrl} controls />
```

## 8. Security Considerations

- **Expiry Time**: Set appropriate expiry times for presigned URLs
- **Authentication**: Add JWT guards for user authentication
- **Rate Limiting**: Implement rate limiting on stream endpoints
- **CORS**: Configure CORS for your frontend domain
- **File Validation**: Validate file types and sizes during upload

## 9. Error Handling

The implementation includes proper error handling for:
- Missing movies in database
- Missing video files in MinIO
- Invalid quality parameters
- MinIO connection errors

## 10. Testing

Test your implementation:
1. Upload a video file to MinIO bucket
2. Call the stream endpoint
3. Verify the presigned URL works in a video player
4. Test expiry behavior
5. Test with different quality options

## Next Steps

1. Implement file upload endpoints for adding movies
2. Add video transcoding pipeline for multiple qualities
3. Implement user authentication and authorization
4. Add streaming analytics and logging
5. Set up video thumbnail generation