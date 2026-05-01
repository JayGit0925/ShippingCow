-- Fix: handle_new_user, write_audit_log, consume_quota use SET search_path = ''
-- so unqualified table refs fail. Qualify everything with public.

CREATE OR REPLACE FUNCTION write_audit_log(
  p_actor_user_id UUID,
  p_org_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO public.audit_log (
    actor_user_id, org_id, action, resource_type,
    resource_id, before_value, after_value, reason
  ) VALUES (
    p_actor_user_id, p_org_id, p_action, p_resource_type,
    p_resource_id, p_before, p_after, p_reason
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id UUID;
  v_company_name TEXT;
BEGIN
  v_company_name := COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'org_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.orgs (name, tenant_type, tier)
    VALUES (v_company_name, 'seller', 'calf')
    RETURNING id INTO v_org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (v_org_id, NEW.id, 'owner');

  INSERT INTO public.usage_quota (org_id, capability, used)
    VALUES (v_org_id, 'mooovy_turns', 0),
           (v_org_id, 'csv_parses', 0),
           (v_org_id, 'file_uploads_per_month', 0),
           (v_org_id, 'silo_file_parses_per_month', 0);

  INSERT INTO public.audit_log (
    actor_user_id, org_id, action, resource_type,
    resource_id, before_value, after_value
  ) VALUES (
    NEW.id, v_org_id, 'org.create', 'org',
    v_org_id::text, NULL, jsonb_build_object(
      'name', v_company_name, 'tier', 'calf', 'tenant_type', 'seller'
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION consume_quota(
  p_org_id UUID,
  p_capability TEXT,
  p_amount INTEGER DEFAULT 1
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_new_used INTEGER;
BEGIN
  v_period_start := date_trunc('month', now());

  INSERT INTO public.usage_quota (org_id, capability, used, period_start)
    VALUES (p_org_id, p_capability, p_amount, v_period_start)
    ON CONFLICT (org_id, capability, period_start)
    DO UPDATE SET used = public.usage_quota.used + p_amount
    RETURNING used INTO v_new_used;

  RETURN v_new_used;
END;
$$;
