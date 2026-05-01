import type { SupabaseClient } from '@supabase/supabase-js';
import { TIER_LIMITS } from './limits';
import { TierViolationError } from '../types/tier';
import type { Capability, Tier, CapabilityCheckResult, QuotaValue } from '../types/tier';

interface UsageRow {
  used: number;
}

export async function assertCapability(
  supabase: SupabaseClient,
  orgId: string,
  capability: Capability
): Promise<CapabilityCheckResult> {
  const { data: org, error } = await supabase
    .from('orgs')
    .select('tier')
    .eq('id', orgId)
    .single();

  if (error || !org) {
    throw new Error(`Org not found: ${orgId}`);
  }

  const tier = org.tier as Tier;
  const limit = TIER_LIMITS[capability][tier];

  if (limit === 0) {
    throw new TierViolationError(
      `Capability "${capability}" is not available on the ${tier} tier. Upgrade to unlock.`,
      capability,
      tier,
      limit
    );
  }

  if (limit === 'unlimited') {
    return { allowed: true, limit, remaining: 'unlimited' };
  }

  const numericLimit = limit as number;

  const { data: usageData, error: usageError } = await supabase
    .from('usage_quota')
    .select('used')
    .eq('org_id', orgId)
    .eq('capability', capability)
    .single();

  const used = usageError || !usageData ? 0 : (usageData as UsageRow).used;

  if (used >= numericLimit) {
    throw new TierViolationError(
      `Quota exhausted for "${capability}" (${used}/${numericLimit}). Upgrade to increase your limit.`,
      capability,
      tier,
      limit
    );
  }

  return { allowed: true, limit, used, remaining: numericLimit - used };
}
