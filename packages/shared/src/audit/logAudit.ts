import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditLogParams } from '../types/audit';

export async function logAudit(
  supabase: SupabaseClient,
  params: AuditLogParams
): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc('write_audit_log', {
    p_actor_user_id: user?.id ?? null,
    p_org_id: params.org_id ?? null,
    p_action: params.action,
    p_resource_type: params.resource_type,
    p_resource_id: params.resource_id ?? null,
    p_before: params.before ?? null,
    p_after: params.after ?? null,
    p_reason: params.reason ?? null,
  });

  if (error) {
    console.error('audit_log write failed:', error);
    throw new Error(`Failed to write audit log: ${error.message}`);
  }

  return data as number;
}
