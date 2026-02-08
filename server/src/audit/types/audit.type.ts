import { Generated } from 'kysely';
import { z } from 'zod/v4';

export const auditActionSchema = z.enum([
  'status_update',
  'priority_update',
  'delete',
  'bulk_status_update',
  'bulk_delete',
  'auto_match',
  'manual_match',
  'role_change',
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogSchema = z.object({
  id: z.uuid(),
  admin_id: z.uuid().nullable(),
  action: auditActionSchema,
  entity_type: z.string().max(50),
  entity_id: z.uuid(),
  old_values: z.record(z.string(), z.unknown()).nullable().optional(),
  new_values: z.record(z.string(), z.unknown()).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.date(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export type AuditLogTable = {
  id: Generated<string>;
  admin_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: Generated<Date>;
};

export interface CreateAuditLogEntry {
  admin_id?: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

// Extended audit log with admin username for display
export interface AuditLogWithAdmin extends AuditLog {
  admin_username: string | null;
}
