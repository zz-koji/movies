import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { AuditService } from './audit.service';

@Module({
  imports: [DatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
