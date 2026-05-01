-- Phase 0 Foundation: Core Tables
-- Migration: 001_core_tables

-- Tenant container
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tenant_type TEXT NOT NULL DEFAULT 'seller'
    CHECK (tenant_type IN ('seller', 'manufacturer', 'shipper')),
  tier TEXT NOT NULL DEFAULT 'calf'
    CHECK (tier IN ('calf', 'cow', 'bull')),
  tier_effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Users within a tenant
CREATE TABLE org_members (
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Internal team members
CREATE TABLE platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'super_admin'
    CHECK (role IN ('super_admin', 'support_admin', 'billing_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage quotas for tier enforcement
CREATE TABLE usage_quota (
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  PRIMARY KEY (org_id, capability, period_start)
);

-- Append-only audit log (7-year retention)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  org_id UUID REFERENCES orgs(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  ticket_id TEXT,
  ip_address INET
);

CREATE INDEX idx_audit_log_org ON audit_log(org_id, occurred_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action, occurred_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id, occurred_at DESC);
