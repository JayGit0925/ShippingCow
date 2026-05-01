-- Mooovy can only run SELECT queries scoped to the caller's org via RLS.
-- Run as the calling user (no SECURITY DEFINER) so RLS still applies.

CREATE OR REPLACE FUNCTION public.mooovy_query(p_sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_normalized TEXT;
  v_result JSONB;
BEGIN
  -- Sanity: caller must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mooovy_query: not authenticated';
  END IF;

  v_normalized := lower(trim(p_sql));

  -- SELECT-only enforcement
  IF NOT v_normalized LIKE 'select %' AND NOT v_normalized LIKE 'with %' THEN
    RAISE EXCEPTION 'mooovy_query: only SELECT and WITH (CTE) statements allowed';
  END IF;

  -- Block obvious destructive keywords
  IF v_normalized ~ '\m(insert|update|delete|drop|alter|truncate|grant|revoke|create|copy)\M' THEN
    RAISE EXCEPTION 'mooovy_query: write/DDL keywords blocked';
  END IF;

  -- Run, aggregate to jsonb. RLS still applies because we're not SECURITY DEFINER.
  EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', p_sql) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.mooovy_query(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mooovy_query(TEXT) TO authenticated;
