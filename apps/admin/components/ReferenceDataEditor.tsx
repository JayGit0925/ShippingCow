'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Row = Record<string, unknown>;

interface Props {
  slug: string;
  table: string;
  label: string;
  columns: string[];
  published: Row[];
  drafts: Row[];
  isVersioned: boolean;
}

export function ReferenceDataEditor({ slug: _slug, table, label, columns, published, drafts: initialDrafts, isVersioned }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [drafts, setDrafts] = useState<Row[]>(initialDrafts);
  const [bulkPaste, setBulkPaste] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  async function addDraft(row: Partial<Row>) {
    setBusy(true);
    setError(null);
    const payload = isVersioned
      ? { ...row, is_draft: true, version: 1, effective_from: effectiveFrom }
      : { ...row };
    const { data, error: insertError } = await supabase.from(table).insert(payload).select().single();
    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setDrafts([...drafts, data as Row]);
    }
    setBusy(false);
  }

  async function deleteDraft(id: string) {
    setBusy(true);
    const { error: delError } = await supabase.from(table).delete().eq('id', id);
    if (delError) setError(delError.message);
    else setDrafts(drafts.filter((d) => d.id !== id));
    setBusy(false);
  }

  async function publish() {
    if (!isVersioned) return;
    if (drafts.length === 0) { setError('No drafts to publish.'); return; }
    if (!confirm(`Publish ${drafts.length} draft rows for ${label}? Effective ${effectiveFrom}.`)) return;
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('publish_reference_set', {
      p_table_name: table,
      p_effective_from: effectiveFrom,
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_reason: 'Published via admin UI',
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
    } else {
      alert(`Published ${data} rows.`);
      router.refresh();
    }
  }

  async function pasteBulk() {
    if (!bulkPaste.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const lines = bulkPaste.trim().split('\n');
      const header = lines[0].split(/\t|,/).map((s) => s.trim());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(/\t|,/);
        const row: Row = {};
        header.forEach((col, i) => {
          const v = vals[i]?.trim();
          if (v === undefined || v === '') return;
          row[col] = isNaN(Number(v)) ? v : Number(v);
        });
        if (isVersioned) {
          row.is_draft = true;
          row.version = 1;
          row.effective_from = effectiveFrom;
        }
        return row;
      });
      const { error: insertError } = await supabase.from(table).insert(rows);
      if (insertError) setError(insertError.message);
      else { setBulkPaste(''); router.refresh(); }
    } catch (e) {
      setError(`Parse error: ${(e as Error).message}`);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{label}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {published.length} published row{published.length === 1 ? '' : 's'}
          {isVersioned && drafts.length > 0 && (
            <span className="text-amber-700 ml-2">· {drafts.length} pending draft{drafts.length === 1 ? '' : 's'}</span>
          )}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {isVersioned && (
        <section className="border rounded-lg p-4 bg-amber-50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Drafts ({drafts.length})</h2>
              <p className="text-xs text-gray-600">Stage changes here, then publish atomically with effective date.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Effective from:</label>
              <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm" />
              <button onClick={publish} disabled={busy || drafts.length === 0}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50">
                Publish {drafts.length} draft{drafts.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="overflow-auto max-h-72 border rounded bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    {columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((row) => (
                    <tr key={String(row.id)} className="border-t">
                      {columns.map((c) => <td key={c} className="px-2 py-1">{String(row[c] ?? '')}</td>)}
                      <td className="px-2 py-1">
                        <button onClick={() => deleteDraft(String(row.id))} className="text-red-600 hover:underline">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-sm font-medium">Bulk paste (TSV/CSV with header row)</summary>
            <div className="mt-2 space-y-2">
              <textarea value={bulkPaste} onChange={(e) => setBulkPaste(e.target.value)}
                placeholder={`${columns.join('\t')}\n...`}
                className="w-full border rounded p-2 text-xs font-mono" rows={6} />
              <button onClick={pasteBulk} disabled={busy} className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                Add as drafts
              </button>
            </div>
          </details>

          <AddRowForm columns={columns} onAdd={addDraft} busy={busy} />
        </section>
      )}

      {!isVersioned && (
        <AddRowForm columns={columns} onAdd={addDraft} busy={busy} />
      )}

      <section>
        <h2 className="font-semibold mb-2">Published ({published.length})</h2>
        <div className="overflow-auto border rounded bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                {columns.map((c) => <th key={c} className="px-2 py-1 text-left">{c}</th>)}
                {isVersioned && <th className="px-2 py-1 text-left">v</th>}
                {isVersioned && <th className="px-2 py-1 text-left">effective</th>}
              </tr>
            </thead>
            <tbody>
              {published.map((row) => (
                <tr key={String(row.id)} className="border-t">
                  {columns.map((c) => <td key={c} className="px-2 py-1">{String(row[c] ?? '')}</td>)}
                  {isVersioned && <td className="px-2 py-1">{String(row.version ?? '')}</td>}
                  {isVersioned && (
                    <td className="px-2 py-1">
                      {String(row.effective_from ?? '')}
                      {row.effective_to ? ` → ${row.effective_to}` : ' → now'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AddRowForm({ columns, onAdd, busy }: { columns: string[]; onAdd: (row: Partial<Row>) => Promise<void>; busy: boolean }) {
  const [row, setRow] = useState<Record<string, string>>({});

  async function submit() {
    const parsed: Partial<Row> = {};
    for (const col of columns) {
      const v = row[col]?.trim();
      if (v === undefined || v === '') continue;
      parsed[col] = isNaN(Number(v)) ? v : Number(v);
    }
    await onAdd(parsed);
    setRow({});
  }

  return (
    <div className="border-t pt-3">
      <h3 className="text-sm font-medium mb-2">Add row</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {columns.map((c) => (
          <div key={c}>
            <label className="block text-xs text-gray-600">{c}</label>
            <input value={row[c] ?? ''} onChange={(e) => setRow({ ...row, [c]: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        ))}
      </div>
      <button onClick={submit} disabled={busy} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
        Add
      </button>
    </div>
  );
}
