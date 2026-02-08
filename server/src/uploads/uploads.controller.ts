import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { UploadsProcessingService } from './uploads-processing.service';
import { UploadsService } from './uploads.service';
import { UploadRecord } from './uploads.types';

interface CreateUploadBody {
	title?: string;
}

@Controller('uploads')
export class UploadsController {
	constructor(
		private readonly uploadsService: UploadsService,
		private readonly uploadsProcessingService: UploadsProcessingService
	) { }

	@Post('movies')
	@UseInterceptors(FileInterceptor('file'))
	async uploadMovie(@UploadedFile() file: Express.Multer.File, @Body() body: CreateUploadBody) {
		if (!file) {
			throw new BadRequestException('A movie file is required.');
		}
		const storedPath = file.path;
		const uploadId = randomUUID();
		const now = new Date();
		const record: UploadRecord = {
			id: uploadId,
			originalName: body.title && body.title.trim().length > 0 ? body.title.trim() : file.originalname,
			storedPath,
			status: 'queued',
			createdAt: now,
			updatedAt: now,
		};

		this.uploadsService.createUpload(record);
		void this.uploadsProcessingService.handleUpload(record);

		return {
			id: uploadId,
			status: record.status,
		};
	}

	@Get('movies/:id/status')
	async getUploadStatus(@Param('id') id: string) {
		const record = this.uploadsService.getUpload(id);
		if (!record) {
			return {
				id,
				status: 'failed',
				message: 'Upload record not found.',
			};
		}

		return {
			id: record.id,
			status: record.status,
			message: record.message,
			targetPath: record.targetPath,
		};
	}
}
