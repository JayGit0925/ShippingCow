-- Phase 0.5 seed: real warehouses + sample zone matrix + FedEx Ground rates (illustrative).
-- Published immediately so Phase 1 ingestion can use them.

-- Warehouses (3PL footprint)
INSERT INTO public.warehouses (name, zip, city, state) VALUES
  ('New Brunswick', '08901', 'New Brunswick', 'NJ'),
  ('Ontario',       '91761', 'Ontario',        'CA'),
  ('Missouri City', '77489', 'Missouri City',  'TX')
ON CONFLICT DO NOTHING;

-- Zone matrix sample (origin NJ 089 → various dests)
-- Real lookup is dense; this seed covers the common destination prefixes for Phase 1 testing.
INSERT INTO public.zone_matrix
  (origin_zip_prefix, destination_zip_prefix, zone, version, effective_from, is_draft, published_at)
VALUES
  -- From NJ 089
  ('089', '100', 2, 1, '2026-01-01', FALSE, now()),  -- NY metro
  ('089', '101', 2, 1, '2026-01-01', FALSE, now()),
  ('089', '300', 5, 1, '2026-01-01', FALSE, now()),  -- Atlanta
  ('089', '600', 5, 1, '2026-01-01', FALSE, now()),  -- Chicago
  ('089', '770', 6, 1, '2026-01-01', FALSE, now()),  -- Houston
  ('089', '900', 8, 1, '2026-01-01', FALSE, now()),  -- LA
  ('089', '940', 8, 1, '2026-01-01', FALSE, now()),  -- SF
  ('089', '981', 8, 1, '2026-01-01', FALSE, now()),  -- Seattle
  -- From CA 917
  ('917', '900', 2, 1, '2026-01-01', FALSE, now()),
  ('917', '940', 2, 1, '2026-01-01', FALSE, now()),
  ('917', '770', 5, 1, '2026-01-01', FALSE, now()),
  ('917', '600', 6, 1, '2026-01-01', FALSE, now()),
  ('917', '300', 7, 1, '2026-01-01', FALSE, now()),
  ('917', '100', 8, 1, '2026-01-01', FALSE, now()),
  -- From TX 774
  ('774', '770', 2, 1, '2026-01-01', FALSE, now()),
  ('774', '300', 4, 1, '2026-01-01', FALSE, now()),
  ('774', '600', 5, 1, '2026-01-01', FALSE, now()),
  ('774', '100', 6, 1, '2026-01-01', FALSE, now()),
  ('774', '900', 6, 1, '2026-01-01', FALSE, now())
ON CONFLICT DO NOTHING;

-- FedEx Ground sample rates (zone 2-8 × weight bands 1-150 lb).
-- Illustrative numbers — admin will replace with real negotiated rates via UI.
INSERT INTO public.our_carrier_rates
  (carrier, service_level, zone, weight_band_lb_min, weight_band_lb_max, rate_usd, version, effective_from, is_draft, published_at)
SELECT
  'FedEx', 'Ground', z, w_min, w_max,
  -- Pricing curve: base + per-zone + per-weight
  ROUND((8.50 + (z * 0.75) + (w_min * 0.18))::numeric, 2),
  1, '2026-01-01', FALSE, now()
FROM
  generate_series(2, 8) z,
  (VALUES (1, 5), (5, 10), (10, 20), (20, 30), (30, 50), (50, 70), (70, 100), (100, 150)) w(w_min, w_max)
ON CONFLICT DO NOTHING;

-- Warehousing fees
INSERT INTO public.our_warehousing_fees
  (fee_type, rate_usd, unit, version, effective_from, is_draft, published_at)
VALUES
  ('storage_per_pallet_per_month', 25.00, 'pallet/month', 1, '2026-01-01', FALSE, now()),
  ('receiving_per_pallet',          12.00, 'pallet',       1, '2026-01-01', FALSE, now()),
  ('pick_pack_per_unit',             1.50, 'unit',         1, '2026-01-01', FALSE, now()),
  ('return_processing',              4.00, 'unit',         1, '2026-01-01', FALSE, now())
ON CONFLICT DO NOTHING;

-- Category benchmarks (industry-average dim weight ratio etc.)
INSERT INTO public.category_benchmarks
  (category, dimension, benchmark_value, version, effective_from, is_draft, published_at)
VALUES
  ('furniture',    'avg_dim_overcharge_pct', 0.18, 1, '2026-01-01', FALSE, now()),
  ('appliances',   'avg_dim_overcharge_pct', 0.22, 1, '2026-01-01', FALSE, now()),
  ('exercise',     'avg_dim_overcharge_pct', 0.25, 1, '2026-01-01', FALSE, now()),
  ('electronics',  'avg_dim_overcharge_pct', 0.05, 1, '2026-01-01', FALSE, now())
ON CONFLICT DO NOTHING;
