import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAudit } from '@shippingcow/shared';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { parsed_record_id, user_edits } = await request.json();
  if (!parsed_record_id) return NextResponse.json({ error: 'parsed_record_id required' }, { status: 400 });

  const { data: pr } = await supabase
    .from('parsed_records').select('*').eq('id', parsed_record_id).single();
  if (!pr) return NextResponse.json({ error: 'Parsed record not found' }, { status: 404 });
  if (pr.status !== 'pending') return NextResponse.json({ error: `Status is ${pr.status}` }, { status: 400 });

  const payload = (user_edits ?? pr.parsed_payload) as { rows: Array<Record<string, string | number>> };
  const rows = payload.rows ?? [];
  if (rows.length === 0) return NextResponse.json({ error: 'No rows to confirm' }, { status: 400 });

  // Look up source raw upload for filename / silo file naming
  const { data: rawUpload } = await supabase
    .from('raw_uploads').select('filename, storage_path').eq('id', pr.raw_upload_id).single();

  // Create silo file row (canonical store)
  const { data: silo, error: siloError } = await supabase
    .from('silo_files')
    .insert({
      org_id: pr.org_id,
      uploaded_by_user_id: user.id,
      filename: rawUpload?.filename ?? 'shipments.csv',
      schema_type: 'shipments',
      row_count: rows.length,
      generated_by_mooovy: false,
      source_raw_upload_id: pr.raw_upload_id,
    })
    .select()
    .single();
  if (siloError) return NextResponse.json({ error: siloError.message }, { status: 500 });

  // Map canonical fields → shipments columns. Defaults for missing required fields.
  const inserts = rows
    .filter((r) => r.date && r.origin_zip && r.destination_zip && r.carrier && (r.billable_weight_lb ?? r.actual_weight_lb))
    .map((r) => ({
      org_id: pr.org_id,
      ship_date: r.date,
      sku: r.sku ?? null,
      category: r.category ?? null,
      cost_per_package: r.cost_per_package ?? null,
      cost_usd: r.cost_per_package ?? null,
      packages_shipped: Number(r.packages_shipped ?? 1),
      length_in: r.length_in ?? null,
      width_in: r.width_in ?? null,
      height_in: r.height_in ?? null,
      origin_zip: String(r.origin_zip),
      destination_zip: String(r.destination_zip),
      actual_weight_lb: r.actual_weight_lb ?? null,
      billable_weight_lb: r.billable_weight_lb ?? r.actual_weight_lb,
      carrier: String(r.carrier),
      selling_platform: r.selling_platform ?? null,
      source_silo_file_id: silo.id,
    }));

  if (inserts.length === 0) {
    return NextResponse.json({ error: 'No rows have all required fields (date, zips, carrier, weight)' }, { status: 400 });
  }

  const { error: insertError } = await supabase.from('shipments').insert(inserts);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Mark parsed record confirmed
  await supabase.from('parsed_records')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), user_edits: user_edits ?? null })
    .eq('id', parsed_record_id);

  // Audit
  await logAudit(supabase, {
    org_id: pr.org_id,
    action: 'shipments.ingest',
    resource_type: 'silo_file',
    resource_id: silo.id,
    after: { row_count: inserts.length, source_raw_upload_id: pr.raw_upload_id },
  });

  return NextResponse.json({
    silo_file_id: silo.id,
    shipments_inserted: inserts.length,
    skipped: rows.length - inserts.length,
  });
}
