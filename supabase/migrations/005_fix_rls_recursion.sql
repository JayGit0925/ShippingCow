-- Fix: org_members policies self-reference org_members → infinite recursion.
-- Also: WHERE org_id = org_id shadows column name, always true.
-- Solution: SECURITY DEFINER helpers that bypass RLS for membership checks.

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_role(p_org_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

-- Replace org_members policies (drop old recursive ones)
DROP POLICY IF EXISTS "org_members_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_insert_owner_admin" ON public.org_members;
DROP POLICY IF EXISTS "org_members_delete_owner_admin" ON public.org_members;

CREATE POLICY "org_members_select" ON public.org_members FOR SELECT
  USING (public.is_org_member(org_id));

CREATE POLICY "org_members_insert_owner_admin" ON public.org_members FOR INSERT
  WITH CHECK (public.is_org_role(org_id, ARRAY['owner','admin']));

CREATE POLICY "org_members_delete_owner_admin" ON public.org_members FOR DELETE
  USING (public.is_org_role(org_id, ARRAY['owner','admin']));

-- Replace orgs policies
DROP POLICY IF EXISTS "orgs_select_member" ON public.orgs;
DROP POLICY IF EXISTS "orgs_update_owner" ON public.orgs;

CREATE POLICY "orgs_select_member" ON public.orgs FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "orgs_update_owner" ON public.orgs FOR UPDATE
  USING (public.is_org_role(id, ARRAY['owner']));

-- Replace usage_quota
DROP POLICY IF EXISTS "usage_quota_select_own" ON public.usage_quota;

CREATE POLICY "usage_quota_select_own" ON public.usage_quota FOR SELECT
  USING (public.is_org_member(org_id));

-- Replace platform_admins
DROP POLICY IF EXISTS "platform_admins_select" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_insert" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_delete" ON public.platform_admins;

CREATE POLICY "platform_admins_select" ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "platform_admins_insert" ON public.platform_admins FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "platform_admins_delete" ON public.platform_admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Replace audit_log
DROP POLICY IF EXISTS "audit_log_admin_select" ON public.audit_log;

CREATE POLICY "audit_log_admin_select" ON public.audit_log FOR SELECT
  USING (public.is_platform_admin() OR public.is_org_member(org_id));
