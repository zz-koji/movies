import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

@Module({
  providers: [
    MinioService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Client({
          endPoint: configService.getOrThrow('MINIO_ENDPOINT'),
          port: configService.getOrThrow('MINIO_PORT'),
          useSSL:
            configService.getOrThrow('MINIO_USE_SSL') === 'false'
              ? false
              : true,
          accessKey: configService.getOrThrow('MINIO_ACCESS_KEY'),
          secretKey: configService.getOrThrow('MINIO_SECRET_KEY'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['MINIO_CLIENT', MinioService],
})
export class MinioModule {}
