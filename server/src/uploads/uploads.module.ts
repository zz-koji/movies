import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { UploadsProcessingService } from './uploads-processing.service';
import { UploadCommandService } from './uploads-command.service';

@Module({
	imports: [
		MulterModule.registerAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				let uploadDirectory = configService.get<string>('MOVIES_UPLOAD_DIR');
				if (!uploadDirectory) {
					uploadDirectory = path.resolve(process.cwd(), 'uploads');
				}

				fs.mkdirSync(uploadDirectory, { recursive: true });

				const maxUploadBytes = configService.get<string>('MOVIES_UPLOAD_MAX_BYTES');
				let maxFileSize: number | undefined = undefined;
				if (maxUploadBytes) {
					const parsedLimit = Number(maxUploadBytes);
					if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
						maxFileSize = parsedLimit;
					}
				}

				return {
					storage: diskStorage({
						destination: (_req, _file, callback) => {
							callback(null, uploadDirectory);
						},
						filename: (_req, file, callback) => {
							const parsedPath = path.parse(file.originalname);
							let safeBase = parsedPath.name.replace(/[^a-zA-Z0-9-_]/g, '_');
							if (!safeBase) {
								safeBase = 'movie';
							}
							const uniqueSuffix = randomUUID();
							const fileName = `${safeBase}-${uniqueSuffix}${parsedPath.ext}`;
							callback(null, fileName);
						},
					}),
					limits: maxFileSize ? { fileSize: maxFileSize } : undefined,
				};
			},
		}),
	],
	controllers: [UploadsController],
	providers: [UploadsService, UploadsProcessingService, UploadCommandService],
})
export class UploadsModule { }
