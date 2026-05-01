-- Phase 0.5: Reference data tables — versioned, draft/publish workflow.
-- Historical analytics use the rate effective at shipment.ship_date.

-- ===== warehouses =====
CREATE TABLE IF NOT EXISTS public.warehouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  zip         CHAR(5) NOT NULL,
  city        TEXT,
  state       CHAR(2),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== zone_matrix =====
-- Maps origin_zip_prefix + dest_zip_prefix → zone (1-8)
-- Versioned with effective dates. Lookup historical rate by ship_date.
CREATE TABLE IF NOT EXISTS public.zone_matrix (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_zip_prefix        CHAR(3) NOT NULL,
  destination_zip_prefix   CHAR(3) NOT NULL,
  zone                     INT NOT NULL CHECK (zone BETWEEN 1 AND 8),
  version                  INT NOT NULL DEFAULT 1,
  effective_from           DATE NOT NULL,
  effective_to             DATE,
  is_draft                 BOOLEAN NOT NULL DEFAULT TRUE,
  published_at             TIMESTAMPTZ,
  published_by_user_id     UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zone_matrix_lookup
  ON public.zone_matrix (origin_zip_prefix, destination_zip_prefix, effective_from)
  WHERE is_draft = FALSE;

-- ===== our_carrier_rates =====
-- Negotiated rates with FedEx (and other carriers).
-- Source of truth for "what we'd charge" comparisons.
CREATE TABLE IF NOT EXISTS public.our_carrier_rates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier             TEXT NOT NULL,
  service_level       TEXT NOT NULL,
  zone                INT NOT NULL CHECK (zone BETWEEN 1 AND 8),
  weight_band_lb_min  NUMERIC(8,2) NOT NULL,
  weight_band_lb_max  NUMERIC(8,2) NOT NULL,
  rate_usd            NUMERIC(10,4) NOT NULL,
  version             INT NOT NULL DEFAULT 1,
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  is_draft            BOOLEAN NOT NULL DEFAULT TRUE,
  published_at        TIMESTAMPTZ,
  published_by_user_id UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carrier_rates_lookup
  ON public.our_carrier_rates (carrier, service_level, zone, weight_band_lb_min, effective_from)
  WHERE is_draft = FALSE;

-- ===== our_warehousing_fees =====
CREATE TABLE IF NOT EXISTS public.our_warehousing_fees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type            TEXT NOT NULL,
  rate_usd            NUMERIC(10,4) NOT NULL,
  unit                TEXT NOT NULL,
  version             INT NOT NULL DEFAULT 1,
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  is_draft            BOOLEAN NOT NULL DEFAULT TRUE,
  published_at        TIMESTAMPTZ,
  published_by_user_id UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== category_benchmarks =====
-- Industry/category averages for comparison (used when ShippingCow rates absent).
CREATE TABLE IF NOT EXISTS public.category_benchmarks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category            TEXT NOT NULL,
  dimension           TEXT NOT NULL,
  benchmark_value     NUMERIC(10,4) NOT NULL,
  version             INT NOT NULL DEFAULT 1,
  effective_from      DATE NOT NULL,
  effective_to        DATE,
  is_draft            BOOLEAN NOT NULL DEFAULT TRUE,
  published_at        TIMESTAMPTZ,
  published_by_user_id UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== RLS: read by all authenticated; write by platform admins =====
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.our_carrier_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.our_warehousing_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_benchmarks ENABLE ROW LEVEL SECURITY;

-- Authenticated users see published reference data (drafts hidden from non-admins)
CREATE POLICY "warehouses_read_all" ON public.warehouses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "zone_matrix_read_published" ON public.zone_matrix FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_draft = FALSE OR public.is_platform_admin()));

CREATE POLICY "carrier_rates_read_published" ON public.our_carrier_rates FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_draft = FALSE OR public.is_platform_admin()));

CREATE POLICY "warehousing_fees_read_published" ON public.our_warehousing_fees FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_draft = FALSE OR public.is_platform_admin()));

CREATE POLICY "category_benchmarks_read_published" ON public.category_benchmarks FOR SELECT
  USING (auth.role() = 'authenticated' AND (is_draft = FALSE OR public.is_platform_admin()));

-- Write only for platform admins
CREATE POLICY "warehouses_write_admin" ON public.warehouses FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "zone_matrix_write_admin" ON public.zone_matrix FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "carrier_rates_write_admin" ON public.our_carrier_rates FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "warehousing_fees_write_admin" ON public.our_warehousing_fees FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "category_benchmarks_write_admin" ON public.category_benchmarks FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ===== Lookup function: zone for shipment date =====
-- Picks the zone where ship_date is within effective window.
CREATE OR REPLACE FUNCTION public.lookup_zone(
  p_origin_zip CHAR(5),
  p_dest_zip CHAR(5),
  p_ship_date DATE
) RETURNS INT
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT zone FROM public.zone_matrix
  WHERE origin_zip_prefix = LEFT(p_origin_zip, 3)
    AND destination_zip_prefix = LEFT(p_dest_zip, 3)
    AND is_draft = FALSE
    AND effective_from <= p_ship_date
    AND (effective_to IS NULL OR effective_to >= p_ship_date)
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

-- ===== Lookup function: carrier rate for shipment date =====
CREATE OR REPLACE FUNCTION public.lookup_carrier_rate(
  p_carrier TEXT,
  p_service_level TEXT,
  p_zone INT,
  p_weight_lb NUMERIC,
  p_ship_date DATE
) RETURNS NUMERIC
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT rate_usd FROM public.our_carrier_rates
  WHERE carrier = p_carrier
    AND service_level = p_service_level
    AND zone = p_zone
    AND weight_band_lb_min <= p_weight_lb
    AND weight_band_lb_max >= p_weight_lb
    AND is_draft = FALSE
    AND effective_from <= p_ship_date
    AND (effective_to IS NULL OR effective_to >= p_ship_date)
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

-- ===== Publish function: bumps version, closes prev effective_to, audit =====
-- Called from admin route; handles the draft → published transition atomically.
CREATE OR REPLACE FUNCTION public.publish_reference_set(
  p_table_name TEXT,
  p_effective_from DATE,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT := 0;
  v_sql TEXT;
BEGIN
  -- Validate table allowed
  IF p_table_name NOT IN ('zone_matrix', 'our_carrier_rates', 'our_warehousing_fees', 'category_benchmarks') THEN
    RAISE EXCEPTION 'Invalid reference table: %', p_table_name;
  END IF;

  -- Close previous version (set effective_to = day before new effective_from)
  v_sql := format(
    'UPDATE public.%I SET effective_to = $1 - INTERVAL ''1 day''
     WHERE is_draft = FALSE AND effective_to IS NULL',
    p_table_name
  );
  EXECUTE v_sql USING p_effective_from;

  -- Promote drafts to published
  v_sql := format(
    'UPDATE public.%I
     SET is_draft = FALSE,
         effective_from = $1,
         published_at = now(),
         published_by_user_id = $2
     WHERE is_draft = TRUE',
    p_table_name
  );
  EXECUTE v_sql USING p_effective_from, p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Audit
  INSERT INTO public.audit_log (
    actor_user_id, org_id, action, resource_type,
    resource_id, before_value, after_value, reason
  ) VALUES (
    p_user_id, NULL, 'reference_data.publish', p_table_name,
    NULL, NULL,
    jsonb_build_object('rows_published', v_count, 'effective_from', p_effective_from),
    p_reason
  );

  RETURN v_count;
END;
$$;
