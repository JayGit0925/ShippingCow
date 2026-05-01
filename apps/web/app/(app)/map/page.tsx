import { createServerClient } from '@/lib/supabase/server';
import { topDestinationStates, type ShipmentRow } from '@shippingcow/shared';
import { ZoningMap } from '@/components/dashboard/ZoningMap';

export default async function MapPage() {
  const supabase = createServerClient();

  const { data: warehouses } = await supabase.from('warehouses').select('name, zip, city, state').eq('is_active', true);

  const { data: shipments } = await supabase.from('shipments')
    .select('ship_date, carrier, computed_zone, cost_usd, actual_weight_lb, billable_weight_lb, dim_overcharge_usd, sku, category, origin_zip, destination_zip, packages_shipped')
    .order('ship_date', { ascending: false }).limit(5000);

  const topStates = topDestinationStates((shipments ?? []) as ShipmentRow[], 8);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Zoning Map</h1>
        <p className="text-sm text-gray-600 mt-1">
          Barns mark our warehouses. Cow herds walk to your top destination states.
        </p>
      </div>
      <ZoningMap warehouses={warehouses ?? []} topStates={topStates} />
    </div>
  );
}
