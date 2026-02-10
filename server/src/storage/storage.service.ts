import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class StorageService {
    async getDiskUsage() {
        const { stdout } = await execAsync(
            'df -h --output=source,size,used,avail,pcent,target'
        );

        const lines = stdout.trim().split('\n').slice(1);

        return lines.map(line => {
            const [source, size, used, avail, percent, mount] = line.trim().split(/\s+/);
            return {
                source,
                size,
                used,
                available: avail,
                usagePercent: percent,
                mount,
            };
        });
    }


    async getDisks() {
        const [{ stdout }, usage] = await Promise.all([
            execAsync('lsblk -b -o NAME,SIZE,TYPE,MOUNTPOINT -J'),
            this.getFilesystemUsage(),
        ]);

        const data = JSON.parse(stdout);

        data.blockdevices = data.blockdevices
            .filter((d: any) => d.type === 'disk') // hide zram
            .map((disk: any) => {
                disk.children = disk.children
                    ?.filter((p: any) => usage.has(p.name)) // only real filesystems
                    .map((p: any) => ({
                        ...p,
                        usage: usage.get(p.name),
                        mountpoint: usage.get(p.name).mount,
                    }));

                return disk;
            });

        return data;
    }


    private async getFilesystemUsage() {
        const { stdout } = await execAsync(
            'df -B1 --output=source,target,size,used,avail,pcent'
        );

        const lines = stdout.trim().split('\n').slice(1);
        const usage = new Map<string, any>();

        for (const line of lines) {
            const [source, target, size, used, avail, percent] =
                line.trim().split(/\s+/);

            // Normalize: /dev/nvme0n1p3 → nvme0n1p3
            const device = source.replace('/dev/', '');

            usage.set(device, {
                mount: target,
                size: Number(size),
                used: Number(used),
                available: Number(avail),
                percent: Number(percent.replace('%', '')),
            });
        }

        return usage;
    }




}
