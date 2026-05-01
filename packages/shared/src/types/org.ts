import type { Tier } from './tier';

export type TenantType = 'seller' | 'manufacturer' | 'shipper';
export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Org {
  id: string;
  name: string;
  tenant_type: TenantType;
  tier: Tier;
  tier_effective_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  created_at: string;
}
