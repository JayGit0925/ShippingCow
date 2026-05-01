export type AuditAction =
  | 'org.create'
  | 'org.update'
  | 'org.delete'
  | 'member.add'
  | 'member.remove'
  | 'member.role_change'
  | 'admin.access'
  | 'admin.config_change'
  | 'tier.change'
  | 'invite.create'
  | 'invite.accept';

export interface AuditLogEntry {
  id: number;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  org_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  reason: string | null;
  ticket_id: string | null;
  ip_address: string | null;
}

export interface AuditLogParams {
  org_id?: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}
