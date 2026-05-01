'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  parsedRecordId: string;
  payload: {
    rows: Record<string, unknown>[];
    headers: string[];
    mapping: Record<string, string | null>;
    raw_sample: Record<string, unknown>[];
  };
  confidence: number;
  status: string;
  filename: string;
}

const CANONICAL = [
  'date', 'sku', 'category', 'cost_per_package', 'packages_shipped',
  'length_in', 'width_in', 'height_in', 'origin_zip', 'destination_zip',
  'actual_weight_lb', 'billable_weight_lb', 'carrier', 'selling_platform',
];

export function ReviewClient({ parsedRecordId, payload, confidence, status, filename }: Props) {
  const router = useRouter();
  const [mapping, setMapping] = useState(payload.mapping);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalRows = payload.rows.length;
  const previewRows = payload.rows.slice(0, 10);
  const rawPreview = payload.raw_sample;

  async function confirm() {
    if (!confirm_required()) return;
    setBusy(true); setError(null);

    // Re-coerce rows with current mapping if user changed it
    const finalRows = mapping === payload.mapping
      ? payload.rows
      : payload.rows.map((r) => recoerce(r as Record<string, unknown>, mapping, payload.headers, payload.rows[0] as Record<string, unknown>));

    const res = await fetch('/api/ingestion/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        parsed_record_id: parsedRecordId,
        user_edits: mapping === payload.mapping ? null : { ...payload, rows: finalRows, mapping },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Confirm failed (${res.status})`);
      setBusy(false);
      return;
    }
    const result = await res.json();
    alert(`Ingested ${result.shipments_inserted} shipments. ${result.skipped} skipped (missing required fields).`);
    router.push('/silo');
  }

  function confirm_required() {
    const required = ['date', 'origin_zip', 'destination_zip', 'carrier'];
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    const missing = required.filter((r) => !mapped.has(r));
    if (missing.length > 0) {
      if (!window.confirm(`Missing required mappings: ${missing.join(', ')}. Continue anyway? Rows missing these fields will be skipped.`)) {
        return false;
      }
    }
    return true;
  }

  if (status === 'confirmed') {
    return <div className="p-8">This upload was already confirmed.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review parsed data</h1>
        <p className="text-sm text-gray-600 mt-1">
          {filename} · {totalRows} rows · {Math.round(confidence * 100)}% confidence
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

      <section>
        <h2 className="font-semibold mb-2">Column mapping</h2>
        <p className="text-xs text-gray-500 mb-2">Override auto-detected mapping if needed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-auto border rounded p-3 bg-white">
          {payload.headers.map((h) => (
            <div key={h} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">{h}</span>
              <span>→</span>
              <select value={mapping[h] ?? ''} onChange={(e) => setMapping({ ...mapping, [h]: e.target.value || null })}
                className="border rounded px-2 py-1 text-xs flex-1">
                <option value="">(skip)</option>
                {CANONICAL.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section>
          <h2 className="font-semibold mb-2">Raw (first 3 rows)</h2>
          <pre className="bg-gray-900 text-green-300 text-xs p-3 rounded overflow-auto max-h-72">
{JSON.stringify(rawPreview, null, 2)}
          </pre>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Parsed (first 10 rows)</h2>
          <div className="overflow-auto border rounded bg-white max-h-72">
            <table className="text-xs min-w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {CANONICAL.map((c) => <th key={c} className="px-1 py-1 text-left whitespace-nowrap">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {CANONICAL.map((c) => <td key={c} className="px-1 py-1 whitespace-nowrap">{String((r as Record<string, unknown>)[c] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => router.push('/upload')} className="px-4 py-2 border rounded">Cancel</button>
        <button onClick={confirm} disabled={busy} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {busy ? 'Ingesting…' : `Ingest ${totalRows} rows`}
        </button>
      </div>
    </div>
  );
}

function recoerce(_raw: Record<string, unknown>, _mapping: Record<string, string | null>, _headers: string[], _sample: Record<string, unknown>): Record<string, unknown> {
  // Simplified — server will re-coerce. Just pass mapping through.
  return _raw;
}
