// Canonical shipment fields per CLAUDE.md §7.
// Headers from raw files map onto these via heuristic + user confirmation.

export const CANONICAL_SHIPMENT_FIELDS = [
  'date',
  'sku',
  'category',
  'cost_per_package',
  'packages_shipped',
  'length_in',
  'width_in',
  'height_in',
  'origin_zip',
  'destination_zip',
  'actual_weight_lb',
  'billable_weight_lb',
  'carrier',
  'selling_platform',
] as const;

export type CanonicalShipmentField = typeof CANONICAL_SHIPMENT_FIELDS[number];

// Header name → canonical field. Lowercased + stripped.
const ALIASES: Record<string, CanonicalShipmentField> = {
  // date
  'date': 'date', 'ship_date': 'date', 'shipdate': 'date', 'shipped_date': 'date',
  'shipped_on': 'date', 'order_date': 'date',
  // sku
  'sku': 'sku', 'product_sku': 'sku', 'item_sku': 'sku', 'item': 'sku', 'product': 'sku',
  // category
  'category': 'category', 'product_category': 'category', 'cat': 'category',
  // cost
  'cost': 'cost_per_package', 'cost_per_package': 'cost_per_package',
  'shipping_cost': 'cost_per_package', 'rate': 'cost_per_package', 'price': 'cost_per_package',
  // packages
  'packages': 'packages_shipped', 'packages_shipped': 'packages_shipped',
  'qty': 'packages_shipped', 'quantity': 'packages_shipped',
  // dims
  'length': 'length_in', 'length_in': 'length_in', 'l': 'length_in',
  'width': 'width_in', 'width_in': 'width_in', 'w': 'width_in',
  'height': 'height_in', 'height_in': 'height_in', 'h': 'height_in',
  // zips
  'origin_zip': 'origin_zip', 'from_zip': 'origin_zip', 'ship_from_zip': 'origin_zip',
  'destination_zip': 'destination_zip', 'dest_zip': 'destination_zip',
  'to_zip': 'destination_zip', 'ship_to_zip': 'destination_zip',
  // weight
  'actual_weight': 'actual_weight_lb', 'actual_weight_lb': 'actual_weight_lb',
  'weight': 'actual_weight_lb', 'weight_lb': 'actual_weight_lb',
  'billable_weight': 'billable_weight_lb', 'billable_weight_lb': 'billable_weight_lb',
  'billed_weight': 'billable_weight_lb',
  // carrier
  'carrier': 'carrier', 'shipper': 'carrier',
  'service': 'carrier', 'service_level': 'carrier',
  // platform
  'selling_platform': 'selling_platform', 'platform': 'selling_platform',
  'channel': 'selling_platform', 'marketplace': 'selling_platform',
};

export function detectColumnMapping(headers: string[]): Record<string, CanonicalShipmentField | null> {
  const mapping: Record<string, CanonicalShipmentField | null> = {};
  for (const h of headers) {
    const norm = h.trim().toLowerCase().replace(/[\s\-]+/g, '_').replace(/[()#]/g, '');
    mapping[h] = ALIASES[norm] ?? null;
  }
  return mapping;
}

// Coerce raw row values into typed canonical row.
// Returns undefined for fields that don't have a sensible value.
export function coerceRow(
  raw: Record<string, unknown>,
  mapping: Record<string, CanonicalShipmentField | null>
): Partial<Record<CanonicalShipmentField, string | number | null>> {
  const out: Partial<Record<CanonicalShipmentField, string | number | null>> = {};
  for (const [srcCol, canonical] of Object.entries(mapping)) {
    if (!canonical) continue;
    const v = raw[srcCol];
    if (v === undefined || v === null || v === '') continue;
    if (['cost_per_package', 'packages_shipped', 'length_in', 'width_in', 'height_in',
         'actual_weight_lb', 'billable_weight_lb'].includes(canonical)) {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,]/g, ''));
      if (!isNaN(n)) out[canonical] = n;
    } else if (canonical === 'origin_zip' || canonical === 'destination_zip') {
      out[canonical] = String(v).padStart(5, '0').slice(0, 5);
    } else if (canonical === 'date') {
      // Normalize to ISO date
      const d = new Date(String(v));
      out[canonical] = isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
    } else {
      out[canonical] = String(v);
    }
  }
  return out;
}
