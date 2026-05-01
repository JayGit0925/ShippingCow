'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'uploading' | 'parsing'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);

    setStage('uploading');
    const form = new FormData();
    form.append('file', file);
    const upRes = await fetch('/api/ingestion/upload', { method: 'POST', body: form });
    if (!upRes.ok) {
      const body = await upRes.json().catch(() => ({}));
      setError(body.error ?? `Upload failed (${upRes.status})`);
      setBusy(false); setStage('idle');
      return;
    }
    const { raw_upload } = await upRes.json();

    setStage('parsing');
    const parseRes = await fetch('/api/ingestion/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raw_upload_id: raw_upload.id }),
    });
    if (!parseRes.ok) {
      const body = await parseRes.json().catch(() => ({}));
      setError(body.error ?? `Parse failed (${parseRes.status})`);
      setBusy(false); setStage('idle');
      return;
    }
    const { parsed_record_id } = await parseRes.json();

    router.push(`/upload/review/${parsed_record_id}`);
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload shipments</h1>
        <p className="text-sm text-gray-600 mt-1">
          CSV or XLSX. We&apos;ll parse and let you review before ingesting.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 border rounded-lg p-6 bg-white">
        <div>
          <label className="block text-sm font-medium mb-1">Choose file</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {file && (
            <p className="text-xs text-gray-500 mt-1">
              {file.name} · {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
        )}

        <button type="submit" disabled={!file || busy}
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50">
          {stage === 'uploading' ? 'Uploading…' : stage === 'parsing' ? 'Parsing…' : 'Upload and parse'}
        </button>
      </form>

      <div className="text-xs text-gray-500">
        Required columns (we auto-detect): date, sku, origin_zip, destination_zip, carrier,
        actual_weight_lb (or billable_weight_lb), packages_shipped. Length/width/height optional but recommended for dim-weight calculation.
      </div>
    </div>
  );
}
