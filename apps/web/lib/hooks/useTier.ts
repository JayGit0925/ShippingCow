import type { Tier, Capability, QuotaValue } from '@shippingcow/shared';
import { TIER_LIMITS } from '@shippingcow/shared';

export function computeTierAccess(tier: Tier) {
  return {
    tier,
    can(capability: Capability): boolean {
      const limit = TIER_LIMITS[capability][tier];
      return limit !== 0;
    },
    limit(capability: Capability): QuotaValue {
      return TIER_LIMITS[capability][tier];
    },
    isCalf: tier === 'calf',
    isCow: tier === 'cow',
    isBull: tier === 'bull',
  };
}
