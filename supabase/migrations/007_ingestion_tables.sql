-- Phase 1: Ingestion pipeline + Silo. Fact tables + raw upload + parsed records.

-- ===== shipments (primary fact table) =====
CREATE TABLE IF NOT EXISTS public.shipments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  ship_date           DATE NOT NULL,
  sku                 TEXT,
  category            TEXT,
  cost_per_package    NUMERIC(10,2),
  packages_shipped    INT NOT NULL DEFAULT 1,
  length_in           NUMERIC(6,2),
  width_in            NUMERIC(6,2),
  height_in           NUMERIC(6,2),
  origin_zip          CHAR(5) NOT NULL,
  destination_zip     CHAR(5) NOT NULL,
  actual_weight_lb    NUMERIC(8,2),
  billable_weight_lb  NUMERIC(8,2) NOT NULL,
  carrier             TEXT NOT NULL,
  selling_platform    TEXT,
  -- Computed fields:
  dim_weight_lb       NUMERIC(8,2),
  computed_zone       INT CHECK (computed_zone BETWEEN 1 AND 8),
  dim_overcharge_usd  NUMERIC(10,2),
  cost_usd            NUMERIC(10,2),
  service_level       TEXT,
  -- Provenance:
  source_silo_file_id UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_org_date ON public.shipments(org_id, ship_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_org_zone ON public.shipments(org_id, computed_zone);
CREATE INDEX IF NOT EXISTS idx_shipments_org_carrier ON public.shipments(org_id, carrier);
CREATE INDEX IF NOT EXISTS idx_shipments_org_sku ON public.shipments(org_id, sku);

-- ===== products =====
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  sku               TEXT NOT NULL,
  name              TEXT,
  category          TEXT,
  country_of_origin TEXT,
  hts_code          TEXT,
  length_in         NUMERIC(6,2),
  width_in          NUMERIC(6,2),
  height_in         NUMERIC(6,2),
  weight_lb         NUMERIC(8,2),
  unit_cost_usd     NUMERIC(10,2),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, sku)
);

-- ===== raw_uploads =====
CREATE TABLE IF NOT EXISTS public.raw_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  filename     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_uploads_org ON public.raw_uploads(org_id, uploaded_at DESC);

-- ===== silo_files (canonical XLSX/CSV per org) =====
CREATE TABLE IF NOT EXISTS public.silo_files (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  uploaded_by_user_id     UUID REFERENCES auth.users(id),
  filename                TEXT NOT NULL,
  schema_type             TEXT NOT NULL DEFAULT 'shipments'
    CHECK (schema_type IN ('shipments', 'products', 'orders', 'returns', 'other')),
  row_count               INT NOT NULL DEFAULT 0,
  size_bytes              BIGINT,
  storage_path            TEXT,
  generated_by_mooovy     BOOLEAN NOT NULL DEFAULT FALSE,
  source_conversation_id  UUID,
  source_raw_upload_id    UUID REFERENCES public.raw_uploads(id),
  uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_silo_files_org ON public.silo_files(org_id, uploaded_at DESC) WHERE deleted_at IS NULL;

-- Add source_silo_file_id FK now that silo_files exists
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_source_silo_file_id_fkey
  FOREIGN KEY (source_silo_file_id) REFERENCES public.silo_files(id);

-- ===== parsed_records (pre-confirmation, auto-expiring) =====
CREATE TABLE IF NOT EXISTS public.parsed_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_upload_id     UUID REFERENCES public.raw_uploads(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  schema_type       TEXT NOT NULL DEFAULT 'shipments',
  parsed_payload    JSONB NOT NULL,
  confidence_score  REAL NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired')),
  user_edits        JSONB,
  confirmed_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parsed_records_org_status
  ON public.parsed_records(org_id, status, created_at DESC);

-- ===== RLS: org-scoped via is_org_member =====
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parsed_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipments_select_org" ON public.shipments FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "shipments_insert_org" ON public.shipments FOR INSERT
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "shipments_update_org" ON public.shipments FOR UPDATE
  USING (public.is_org_member(org_id));
CREATE POLICY "shipments_delete_org" ON public.shipments FOR DELETE
  USING (public.is_org_role(org_id, ARRAY['owner','admin']));

CREATE POLICY "products_select_org" ON public.products FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "products_write_org" ON public.products FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "raw_uploads_select_org" ON public.raw_uploads FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "raw_uploads_insert_org" ON public.raw_uploads FOR INSERT
  WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "raw_uploads_delete_org" ON public.raw_uploads FOR DELETE
  USING (public.is_org_role(org_id, ARRAY['owner','admin']));

CREATE POLICY "silo_files_select_org" ON public.silo_files FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "silo_files_write_org" ON public.silo_files FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "parsed_records_select_org" ON public.parsed_records FOR SELECT
  USING (public.is_org_member(org_id));
CREATE POLICY "parsed_records_write_org" ON public.parsed_records FOR ALL
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

-- ===== Computed fields function: dim_weight + zone + overcharge =====
CREATE OR REPLACE FUNCTION public.compute_shipment_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_dim NUMERIC(8,2);
  v_zone INT;
BEGIN
  -- Dim weight (Ground = /139). For Air, caller sets carrier accordingly; default Ground.
  IF NEW.length_in IS NOT NULL AND NEW.width_in IS NOT NULL AND NEW.height_in IS NOT NULL THEN
    v_dim := (NEW.length_in * NEW.width_in * NEW.height_in) / 139.0;
    NEW.dim_weight_lb := v_dim;
  END IF;

  -- Computed zone
  IF NEW.origin_zip IS NOT NULL AND NEW.destination_zip IS NOT NULL AND NEW.ship_date IS NOT NULL THEN
    v_zone := public.lookup_zone(NEW.origin_zip, NEW.destination_zip, NEW.ship_date);
    NEW.computed_zone := v_zone;
  END IF;

  -- Dim overcharge (when billable > actual)
  IF NEW.billable_weight_lb IS NOT NULL AND NEW.actual_weight_lb IS NOT NULL
     AND NEW.cost_usd IS NOT NULL AND NEW.billable_weight_lb > NEW.actual_weight_lb THEN
    NEW.dim_overcharge_usd := ROUND(
      NEW.cost_usd * ((NEW.billable_weight_lb - NEW.actual_weight_lb) / NEW.billable_weight_lb),
      2
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shipments_compute_fields ON public.shipments;
CREATE TRIGGER shipments_compute_fields
  BEFORE INSERT OR UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.compute_shipment_fields();
