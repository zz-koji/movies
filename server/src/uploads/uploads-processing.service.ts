import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'fs';
import path from 'path';
import { UploadCommandService } from './uploads-command.service';
import { UploadRecord } from './uploads.types';
import { UploadsService } from './uploads.service';

@Injectable()
export class UploadsProcessingService {
	constructor(
		private readonly configService: ConfigService,
		private readonly uploadsService: UploadsService,
		private readonly uploadCommandService: UploadCommandService
	) { }

	async handleUpload(record: UploadRecord): Promise<void> {
		this.uploadsService.updateStatus(record.id, 'processing');
		try {
			const targetDirectory = this.getLibraryDirectory();
			await fs.promises.mkdir(targetDirectory, { recursive: true });

			const targetPath = path.join(targetDirectory, path.basename(record.storedPath));
			await this.moveFile(record.storedPath, targetPath);
			this.uploadsService.updateStatus(record.id, 'processing', undefined, targetPath);

			await this.runOptionalCommands(targetDirectory);

			this.uploadsService.updateStatus(record.id, 'completed', 'Upload processed successfully.', targetPath);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Upload processing failed.';
			this.uploadsService.updateStatus(record.id, 'failed', message);
		}
	}

	private getLibraryDirectory(): string {
		const configuredDirectory = this.configService.get<string>('MOVIES_LIBRARY_DIR');
		if (configuredDirectory) {
			return configuredDirectory;
		}
		return path.resolve(process.cwd(), 'movies-library');
	}

	private async moveFile(sourcePath: string, targetPath: string): Promise<void> {
		try {
			await fs.promises.rename(sourcePath, targetPath);
		} catch (error) {
			if (this.isCrossDeviceError(error)) {
				await fs.promises.copyFile(sourcePath, targetPath);
				await fs.promises.unlink(sourcePath);
				return;
			}
			throw error;
		}
	}

	private isCrossDeviceError(error: unknown): boolean {
		if (!this.isErrnoException(error)) {
			return false;
		}
		return error.code === 'EXDEV';
	}

	private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
		if (!(error instanceof Error)) {
			return false;
		}
		return Object.prototype.hasOwnProperty.call(error, 'code');
	}

	private async runOptionalCommands(targetDirectory: string): Promise<void> {
		const rcloneCommand = this.configService.get<string>('MOVIES_RCLONE_COMMAND');
		const rcloneArgs = this.parseArgs(this.configService.get<string>('MOVIES_RCLONE_ARGS'));
		const minidlnaCommand = this.configService.get<string>('MOVIES_DLNA_COMMAND');
		const minidlnaArgs = this.parseArgs(this.configService.get<string>('MOVIES_DLNA_ARGS'));

		const timeoutMs = this.getCommandTimeoutMs();

		if (rcloneCommand) {
			await this.uploadCommandService.runCommand(rcloneCommand, rcloneArgs, timeoutMs, targetDirectory);
		}

		if (minidlnaCommand) {
			await this.uploadCommandService.runCommand(minidlnaCommand, minidlnaArgs, timeoutMs, targetDirectory);
		}
	}

	private getCommandTimeoutMs(): number {
		const configuredValue = this.configService.get<string>('MOVIES_COMMAND_TIMEOUT_MS');
		if (configuredValue) {
			const parsedValue = Number(configuredValue);
			if (Number.isFinite(parsedValue) && parsedValue > 0) {
				return parsedValue;
			}
		}
		return 120000;
	}

	private parseArgs(rawArgs: string | undefined): string[] {
		if (!rawArgs) {
			return [];
		}
		const parsedJson = this.parseJsonArgs(rawArgs);
		if (parsedJson) {
			return parsedJson;
		}
		return rawArgs.split(' ').filter((value) => value.length > 0);
	}

	private parseJsonArgs(rawArgs: string): string[] | null {
		const trimmedValue = rawArgs.trim();
		if (!trimmedValue.startsWith('[') || !trimmedValue.endsWith(']')) {
			return null;
		}
		try {
			const parsedValue: unknown = JSON.parse(trimmedValue);
			if (!Array.isArray(parsedValue)) {
				return null;
			}
			const values: string[] = [];
			for (const value of parsedValue) {
				if (typeof value === 'string') {
					values.push(value);
				}
			}
			return values;
		} catch (error) {
			return null;
		}
	}
}
