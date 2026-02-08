import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

export interface CommandResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
}

@Injectable()
export class UploadCommandService {
	runCommand(command: string, args: string[], timeoutMs: number, workingDirectory?: string): Promise<CommandResult> {
		return new Promise((resolve) => {
			const child = spawn(command, args, {
				cwd: workingDirectory,
				env: process.env,
				stdio: ['ignore', 'pipe', 'pipe'],
			});

			let stdout = '';
			let stderr = '';
			let settled = false;
			let timeoutHandle: NodeJS.Timeout | undefined = undefined;

			if (timeoutMs > 0) {
				timeoutHandle = setTimeout(() => {
					if (!settled) {
						child.kill('SIGTERM');
						settled = true;
						resolve({
							exitCode: null,
							stdout,
							stderr,
							timedOut: true,
						});
					}
				}, timeoutMs);
			}

			child.stdout.on('data', (chunk: Buffer) => {
				stdout = `${stdout}${chunk.toString()}`;
			});

			child.stderr.on('data', (chunk: Buffer) => {
				stderr = `${stderr}${chunk.toString()}`;
			});

			child.on('close', (code) => {
				if (settled) {
					return;
				}
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
				}
				settled = true;
				resolve({
					exitCode: code,
					stdout,
					stderr,
					timedOut: false,
				});
			});

			child.on('error', (error) => {
				if (settled) {
					return;
				}
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
				}
				settled = true;
				resolve({
					exitCode: null,
					stdout,
					stderr: `${stderr}${error.message}`,
					timedOut: false,
				});
			});
		});
	}
}
