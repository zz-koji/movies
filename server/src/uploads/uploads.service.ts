import { Injectable } from '@nestjs/common';
import { UploadRecord, UploadStatus } from './uploads.types';

@Injectable()
export class UploadsService {
	private readonly uploads = new Map<string, UploadRecord>();

	createUpload(record: UploadRecord): UploadRecord {
		this.uploads.set(record.id, record);
		return record;
	}

	getUpload(id: string): UploadRecord | undefined {
		return this.uploads.get(id);
	}

	updateStatus(id: string, status: UploadStatus, message?: string, targetPath?: string): UploadRecord | undefined {
		const current = this.uploads.get(id);
		if (!current) {
			return undefined;
		}

		const resolvedTargetPath = targetPath ? targetPath : current.targetPath;
		const updatedRecord: UploadRecord = {
			...current,
			status,
			message,
			targetPath: resolvedTargetPath,
			updatedAt: new Date(),
		};

		this.uploads.set(id, updatedRecord);
		return updatedRecord;
	}
}
