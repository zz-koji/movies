export type UploadStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface UploadRecord {
	id: string;
	originalName: string;
	storedPath: string;
	targetPath?: string;
	status: UploadStatus;
	createdAt: Date;
	updatedAt: Date;
	message?: string;
}
