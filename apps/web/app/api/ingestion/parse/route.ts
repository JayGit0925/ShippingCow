import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { detectColumnMapping, coerceRow } from '@shippingcow/shared';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { raw_upload_id } = await request.json();
  if (!raw_upload_id) return NextResponse.json({ error: 'raw_upload_id required' }, { status: 400 });

  const { data: rawUpload } = await supabase
    .from('raw_uploads').select('*').eq('id', raw_upload_id).single();
  if (!rawUpload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

  // Download file from storage
  const { data: fileBlob, error: dlError } = await supabase.storage
    .from('raw-uploads').download(rawUpload.storage_path);
  if (dlError || !fileBlob) return NextResponse.json({ error: dlError?.message ?? 'Download failed' }, { status: 500 });

  const buffer = await fileBlob.arrayBuffer();
  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  if (rawUpload.mime_type === 'text/csv') {
    const text = new TextDecoder().decode(buffer);
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    rows = parsed.data;
    headers = parsed.meta.fields ?? [];
  } else if (rawUpload.mime_type?.includes('spreadsheet') || rawUpload.mime_type?.includes('excel')) {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet);
    headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  } else {
    return NextResponse.json(
      { error: `MIME ${rawUpload.mime_type} not supported in this build (PDF/image needs Mooovy AI parse — coming soon)` },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows parsed from file' }, { status: 400 });
  }

  const mapping = detectColumnMapping(headers);
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const confidence = mappedCount / Math.max(1, headers.length);

  const coerced = rows.map((r) => coerceRow(r, mapping));

  // Persist parsed_records (auto-expires in 24h)
  const { data: member } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).single();

  const { data: pr, error: prError } = await supabase
    .from('parsed_records')
    .insert({
      raw_upload_id,
      org_id: member!.org_id,
      schema_type: 'shipments',
      parsed_payload: { rows: coerced, headers, mapping, raw_sample: rows.slice(0, 3) },
      confidence_score: confidence,
      status: 'pending',
    })
    .select()
    .single();

  if (prError) return NextResponse.json({ error: prError.message }, { status: 500 });

  return NextResponse.json({
    parsed_record_id: pr.id,
    row_count: rows.length,
    mapped_columns: mappedCount,
    total_columns: headers.length,
    confidence,
    headers,
    mapping,
    sample_rows: coerced.slice(0, 5),
  });
}
