import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ReferenceDataEditor } from '@/components/ReferenceDataEditor';

const TABLE_CONFIG: Record<string, { table: string; label: string; columns: string[] }> = {
  'zone-matrix': {
    table: 'zone_matrix',
    label: 'Zone Matrix',
    columns: ['origin_zip_prefix', 'destination_zip_prefix', 'zone'],
  },
  'carrier-rates': {
    table: 'our_carrier_rates',
    label: 'Carrier Rates',
    columns: ['carrier', 'service_level', 'zone', 'weight_band_lb_min', 'weight_band_lb_max', 'rate_usd'],
  },
  'warehousing-fees': {
    table: 'our_warehousing_fees',
    label: 'Warehousing Fees',
    columns: ['fee_type', 'rate_usd', 'unit'],
  },
  'category-benchmarks': {
    table: 'category_benchmarks',
    label: 'Category Benchmarks',
    columns: ['category', 'dimension', 'benchmark_value'],
  },
  'warehouses': {
    table: 'warehouses',
    label: 'Warehouses',
    columns: ['name', 'zip', 'city', 'state', 'is_active'],
  },
};

export default async function ReferenceDataPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = TABLE_CONFIG[slug];
  if (!config) notFound();

  const supabase = createServerClient();

  // Warehouses don't use draft/publish (small static list)
  const isVersioned = slug !== 'warehouses';

  const { data: published } = await supabase.from(config.table)
    .select('*')
    .eq('is_draft', false)
    .order(isVersioned ? 'version' : 'name', { ascending: false })
    .limit(200);

  const { data: drafts } = isVersioned
    ? await supabase.from(config.table).select('*').eq('is_draft', true).limit(200)
    : { data: [] as Array<Record<string, unknown>> };

  return (
    <ReferenceDataEditor
      slug={slug}
      table={config.table}
      label={config.label}
      columns={config.columns}
      published={published ?? []}
      drafts={drafts ?? []}
      isVersioned={isVersioned}
    />
  );
}
