import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from 'src/database/types';
import {
  AuditLogWithAdmin,
  CreateAuditLogEntry,
} from './types';

const AUDIT_COLUMNS = [
  'audit_log.id',
  'audit_log.admin_id',
  'audit_log.action',
  'audit_log.entity_type',
  'audit_log.entity_id',
  'audit_log.old_values',
  'audit_log.new_values',
  'audit_log.metadata',
  'audit_log.created_at',
  'users.name as admin_username',
] as const;

@Injectable()
export class AuditService {
  constructor(
    @Inject('MOVIES_DATABASE')
    private readonly db: Kysely<Database>,
  ) {}

  async log(entry: CreateAuditLogEntry): Promise<void> {
    await this.db
      .insertInto('audit_log')
      .values({
        admin_id: entry.admin_id ?? null,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        old_values: entry.old_values ?? null,
        new_values: entry.new_values ?? null,
        metadata: entry.metadata ?? null,
      })
      .execute();
  }

  async getByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogWithAdmin[]> {
    const logs = await this.baseQuery()
      .where('audit_log.entity_type', '=', entityType)
      .where('audit_log.entity_id', '=', entityId)
      .execute();

    return logs.map(this.mapRow);
  }

  async getByAdmin(
    adminId: string,
    limit = 100,
  ): Promise<AuditLogWithAdmin[]> {
    const logs = await this.baseQuery()
      .where('audit_log.admin_id', '=', adminId)
      .limit(limit)
      .execute();

    return logs.map(this.mapRow);
  }

  async getRecent(limit = 100): Promise<AuditLogWithAdmin[]> {
    const logs = await this.baseQuery()
      .limit(limit)
      .execute();

    return logs.map(this.mapRow);
  }

  private baseQuery() {
    return this.db
      .selectFrom('audit_log')
      .leftJoin('users', 'users.id', 'audit_log.admin_id')
      .select(AUDIT_COLUMNS)
      .orderBy('audit_log.created_at', 'desc');
  }

  private mapRow = (log: {
    id: string;
    admin_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
    admin_username: string | null;
  }): AuditLogWithAdmin => ({
    id: log.id,
    admin_id: log.admin_id,
    action: log.action as CreateAuditLogEntry['action'],
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    old_values: log.old_values,
    new_values: log.new_values,
    metadata: log.metadata,
    created_at: log.created_at,
    admin_username: log.admin_username,
  });
}
