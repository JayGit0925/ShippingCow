import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import {
  filterByPeriod, totalSpend, totalDimOvercharge, dimOverchargePct,
  spendByCarrier, spendByZone, spendByDay, topSkusByOvercharge, topDestinationStates,
  type ShipmentRow,
} from '@shippingcow/shared';
import { DimOverchargeCow } from '@/components/dashboard/DimOverchargeCow';
import { SpendByCarrierChart, SpendByZoneChart, SpendByDayChart, TopDestinationStatesChart, TopOverchargeSkus } from '@/components/dashboard/Charts';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const supabase = createServerClient();
  const { period: periodParam } = await searchParams;
  const period = (parseInt(periodParam ?? '90', 10) as 7 | 30 | 90 | 365) || 90;

  const { data: shipments } = await supabase
    .from('shipments')
    .select('ship_date, carrier, computed_zone, cost_usd, actual_weight_lb, billable_weight_lb, dim_overcharge_usd, sku, category, origin_zip, destination_zip, packages_shipped')
    .order('ship_date', { ascending: false })
    .limit(10000);

  const allRows = (shipments ?? []) as ShipmentRow[];

  if (allRows.length === 0) {
    return <EmptyDashboard />;
  }

  const filtered = filterByPeriod(allRows, period);
  const spend = totalSpend(filtered);
  const overchargeUsd = totalDimOvercharge(filtered);
  const overchargePct = dimOverchargePct(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Audit Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filtered.length} of {allRows.length} shipments · last {period} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90, 365].map((p) => (
            <Link key={p} href={`/dashboard?period=${p}`}
              className={`px-3 py-1.5 text-xs uppercase font-mono rounded ${period === p ? 'bg-gray-900 text-white' : 'bg-white border-2 border-gray-300 text-gray-700'}`}>
              {p}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total Spend" value={`$${spend.toFixed(2)}`} />
        <Stat label="Dim Overcharge" value={`$${overchargeUsd.toFixed(2)}`} sub={`${(overchargePct * 100).toFixed(1)}%`} />
        <Stat label="Shipments" value={filtered.length.toString()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DimOverchargeCow overchargePct={overchargePct} overchargeUsd={overchargeUsd} totalSpend={spend} />
        <TopOverchargeSkus data={topSkusByOvercharge(filtered)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpendByCarrierChart data={spendByCarrier(filtered)} />
        <SpendByZoneChart data={spendByZone(filtered)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpendByDayChart data={spendByDay(filtered)} />
        <TopDestinationStatesChart data={topDestinationStates(filtered)} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
      <div className="text-xs font-mono uppercase text-gray-500 tracking-widest">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold uppercase tracking-wide">Audit Dashboard</h1>
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white">
        <h3 className="text-lg font-semibold text-gray-700">Upload shipments to see your audit</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          90 days of shipment data → real cost audit in 90 seconds. We compute your dim overcharge,
          spend by carrier and zone, and surface SKUs leaking margin.
        </p>
        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left max-w-2xl mx-auto">
          <p className="text-xs font-mono uppercase text-gray-500">Preview — what you&apos;ll see</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-md bg-white p-3 shadow-sm border"><p className="text-xs text-gray-400">Annual savings</p><p className="text-xl font-bold text-gray-300">$—</p></div>
            <div className="rounded-md bg-white p-3 shadow-sm border"><p className="text-xs text-gray-400">Dim overcharge</p><p className="text-xl font-bold text-gray-300">—%</p></div>
            <div className="rounded-md bg-white p-3 shadow-sm border"><p className="text-xs text-gray-400">Avg zone</p><p className="text-xl font-bold text-gray-300">—</p></div>
          </div>
        </div>
        <Link href="/upload" className="mt-6 inline-block rounded-md px-6 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: '#0052C9' }}>
          Upload shipment data
        </Link>
      </div>
    </div>
  );
}
