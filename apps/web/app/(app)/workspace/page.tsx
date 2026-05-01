import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import {
  filterByPeriod, totalSpend, totalDimOvercharge, dimOverchargePct,
  spendByCarrier, spendByZone, topSkusByOvercharge, type ShipmentRow,
} from '@shippingcow/shared';
import { DimOverchargeCow } from '@/components/dashboard/DimOverchargeCow';
import { SpendByCarrierChart, SpendByZoneChart, TopOverchargeSkus } from '@/components/dashboard/Charts';

const WIDGETS = {
  dim_cow: { label: 'Dim Overcharge Cow', component: 'cow' },
  carrier: { label: 'Spend by Carrier', component: 'carrier' },
  zone:    { label: 'Spend by Zone',    component: 'zone' },
  top_sku: { label: 'Top SKUs by Overcharge', component: 'top_sku' },
} as const;

export default async function WorkspacePage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: layout } = await supabase.from('workspace_layouts')
    .select('widgets').eq('user_id', user?.id).maybeSingle();

  const widgets = (layout?.widgets as string[] | null) ?? ['dim_cow', 'carrier', 'zone', 'top_sku'];

  const { data: shipments } = await supabase.from('shipments')
    .select('ship_date, carrier, computed_zone, cost_usd, actual_weight_lb, billable_weight_lb, dim_overcharge_usd, sku, category, origin_zip, destination_zip, packages_shipped')
    .order('ship_date', { ascending: false }).limit(10000);

  const rows = (shipments ?? []) as ShipmentRow[];
  const filtered = filterByPeriod(rows, 90);
  const spend = totalSpend(filtered);
  const overUsd = totalDimOvercharge(filtered);
  const overPct = dimOverchargePct(filtered);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Workspace</h1>
          <p className="text-sm text-gray-600 mt-1">Pin the modules you watch most. Last 90 days.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-blue-600 underline">Back to Dashboard</Link>
      </div>

      {rows.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-12 text-center bg-white">
          <p className="text-gray-500">Workspace empty. <Link href="/upload" className="text-blue-600 underline">Upload shipments</Link> to start.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map((wId) => {
            const w = WIDGETS[wId as keyof typeof WIDGETS];
            if (!w) return null;
            if (w.component === 'cow')     return <DimOverchargeCow key={wId} overchargePct={overPct} overchargeUsd={overUsd} totalSpend={spend} />;
            if (w.component === 'carrier') return <SpendByCarrierChart key={wId} data={spendByCarrier(filtered)} />;
            if (w.component === 'zone')    return <SpendByZoneChart key={wId} data={spendByZone(filtered)} />;
            if (w.component === 'top_sku') return <TopOverchargeSkus key={wId} data={topSkusByOvercharge(filtered, 7)} />;
            return null;
          })}
        </div>
      )}
    </div>
  );
}
