// Dashboard aggregates — pure functions that take rows + return summary.
// Period filtering uses the LATEST date in the data, not wall-clock time (per CLAUDE.md §7).

export interface ShipmentRow {
  ship_date: string;
  carrier: string;
  computed_zone: number | null;
  cost_usd: number | null;
  actual_weight_lb: number | null;
  billable_weight_lb: number | null;
  dim_overcharge_usd: number | null;
  sku: string | null;
  category: string | null;
  origin_zip: string;
  destination_zip: string;
  packages_shipped: number;
}

export type PeriodDays = 7 | 30 | 90 | 365;

export function filterByPeriod(rows: ShipmentRow[], days: PeriodDays): ShipmentRow[] {
  if (rows.length === 0) return [];
  const latest = rows.reduce((max, r) => r.ship_date > max ? r.ship_date : max, rows[0].ship_date);
  const latestMs = new Date(latest).getTime();
  const cutoffMs = latestMs - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => new Date(r.ship_date).getTime() >= cutoffMs);
}

export function totalSpend(rows: ShipmentRow[]): number {
  return rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);
}

export function totalDimOvercharge(rows: ShipmentRow[]): number {
  return rows.reduce((sum, r) => sum + (r.dim_overcharge_usd ?? 0), 0);
}

export function dimOverchargePct(rows: ShipmentRow[]): number {
  const spend = totalSpend(rows);
  if (spend === 0) return 0;
  return totalDimOvercharge(rows) / spend;
}

export function spendByCarrier(rows: ShipmentRow[]): Array<{ carrier: string; spend: number; shipments: number }> {
  const m = new Map<string, { spend: number; shipments: number }>();
  for (const r of rows) {
    const cur = m.get(r.carrier) ?? { spend: 0, shipments: 0 };
    cur.spend += r.cost_usd ?? 0;
    cur.shipments += 1;
    m.set(r.carrier, cur);
  }
  return [...m.entries()].map(([carrier, v]) => ({ carrier, ...v })).sort((a, b) => b.spend - a.spend);
}

export function spendByZone(rows: ShipmentRow[]): Array<{ zone: number; spend: number; shipments: number }> {
  const m = new Map<number, { spend: number; shipments: number }>();
  for (const r of rows) {
    if (r.computed_zone == null) continue;
    const cur = m.get(r.computed_zone) ?? { spend: 0, shipments: 0 };
    cur.spend += r.cost_usd ?? 0;
    cur.shipments += 1;
    m.set(r.computed_zone, cur);
  }
  return [...m.entries()].map(([zone, v]) => ({ zone, ...v })).sort((a, b) => a.zone - b.zone);
}

export function topSkusByOvercharge(rows: ShipmentRow[], limit = 5): Array<{ sku: string; overcharge: number; shipments: number }> {
  const m = new Map<string, { overcharge: number; shipments: number }>();
  for (const r of rows) {
    if (!r.sku) continue;
    const cur = m.get(r.sku) ?? { overcharge: 0, shipments: 0 };
    cur.overcharge += r.dim_overcharge_usd ?? 0;
    cur.shipments += 1;
    m.set(r.sku, cur);
  }
  return [...m.entries()]
    .map(([sku, v]) => ({ sku, ...v }))
    .sort((a, b) => b.overcharge - a.overcharge)
    .slice(0, limit);
}

export function spendByDay(rows: ShipmentRow[]): Array<{ date: string; spend: number }> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.ship_date, (m.get(r.ship_date) ?? 0) + (r.cost_usd ?? 0));
  }
  return [...m.entries()].map(([date, spend]) => ({ date, spend })).sort((a, b) => a.date.localeCompare(b.date));
}

export function topDestinationStates(rows: ShipmentRow[], limit = 5): Array<{ state: string; shipments: number }> {
  // Approximate state from ZIP first 3 — production would use a proper ZIP→state table
  const STATE_BY_ZIP3: Record<string, string> = {
    '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY',
    '300': 'GA', '301': 'GA', '302': 'GA',
    '600': 'IL', '601': 'IL', '606': 'IL',
    '770': 'TX', '774': 'TX', '775': 'TX',
    '900': 'CA', '901': 'CA', '902': 'CA', '917': 'CA', '940': 'CA',
    '981': 'WA', '982': 'WA',
    '089': 'NJ', '085': 'NJ',
  };
  const m = new Map<string, number>();
  for (const r of rows) {
    const state = STATE_BY_ZIP3[r.destination_zip.slice(0, 3)] ?? 'Other';
    m.set(state, (m.get(state) ?? 0) + 1);
  }
  return [...m.entries()].map(([state, shipments]) => ({ state, shipments }))
    .sort((a, b) => b.shipments - a.shipments)
    .slice(0, limit);
}
