// storage.controller.ts
import { Controller, Get } from '@nestjs/common';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
    constructor(private readonly storage: StorageService) { }

    @Get('usage')
    getUsage() {
        return this.storage.getDiskUsage();
    }

    @Get('disks')
    getDisks() {
        return this.storage.getDisks();
    }
}
