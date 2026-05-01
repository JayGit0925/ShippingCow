import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

const TABLES = [
  { slug: 'zone-matrix',         table: 'zone_matrix',          label: 'Zone Matrix',          desc: 'ZIP prefix → zone (1-8)' },
  { slug: 'carrier-rates',       table: 'our_carrier_rates',    label: 'Carrier Rates',        desc: 'FedEx + others by zone × weight' },
  { slug: 'warehousing-fees',    table: 'our_warehousing_fees', label: 'Warehousing Fees',     desc: 'Storage, pick/pack, receiving' },
  { slug: 'category-benchmarks', table: 'category_benchmarks',  label: 'Category Benchmarks',  desc: 'Industry averages by category' },
  { slug: 'warehouses',          table: 'warehouses',           label: 'Warehouses',           desc: '3PL footprint locations' },
];

export default async function ReferenceDataIndex() {
  const supabase = createServerClient();

  const counts = await Promise.all(TABLES.map(async (t) => {
    const { count: published } = await supabase.from(t.table)
      .select('*', { count: 'exact', head: true })
      .eq('is_draft', false);
    const { count: drafts } = await supabase.from(t.table)
      .select('*', { count: 'exact', head: true })
      .eq('is_draft', true);
    return { ...t, published: published ?? 0, drafts: drafts ?? 0 };
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reference Data</h1>
        <p className="text-sm text-gray-600 mt-1">
          Versioned, point-in-time. Historical analytics use the rate effective at each shipment&apos;s ship_date.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {counts.map((t) => (
          <Link key={t.slug} href={`/admin/reference-data/${t.slug}`}
            className="block border rounded-lg p-4 hover:border-blue-500 hover:shadow-sm transition">
            <div className="font-semibold text-lg">{t.label}</div>
            <div className="text-sm text-gray-600 mt-1">{t.desc}</div>
            <div className="mt-3 flex gap-3 text-sm">
              <span className="text-green-700">{t.published} published</span>
              {t.drafts > 0 && (
                <span className="text-amber-700">{t.drafts} draft{t.drafts === 1 ? '' : 's'}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
