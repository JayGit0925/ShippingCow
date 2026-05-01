-- Phase 0 Foundation: RLS Policies
-- Migration: 002_rls_policies

-- ===== orgs =====
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_member" ON orgs FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE org_id = id
  ));

CREATE POLICY "orgs_insert_authenticated" ON orgs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "orgs_update_owner" ON orgs FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE org_id = id AND role = 'owner'
  ));

-- ===== org_members =====
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM org_members om WHERE om.org_id = org_id
  ));

CREATE POLICY "org_members_insert_owner_admin" ON org_members FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM org_members WHERE org_id = org_id AND role IN ('owner', 'admin')
  ));

CREATE POLICY "org_members_delete_owner_admin" ON org_members FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE org_id = org_id AND role IN ('owner', 'admin')
  ));

-- ===== platform_admins =====
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_select" ON platform_admins FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM platform_admins));

CREATE POLICY "platform_admins_insert" ON platform_admins FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM platform_admins));

CREATE POLICY "platform_admins_delete" ON platform_admins FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM platform_admins WHERE role = 'super_admin'));

-- ===== usage_quota =====
ALTER TABLE usage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_quota_select_own" ON usage_quota FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM org_members WHERE org_id = org_id
  ));

-- ===== audit_log =====
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_select" ON audit_log FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM platform_admins));
