import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { assertCapability } from '@shippingcow/shared';

const ALLOWED_MIME = new Set([
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: member } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 403 });

  try {
    await assertCapability(supabase, member.org_id, 'csv_parses');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file' }, { status: 400 });
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 });

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${member.org_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('raw-uploads')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: rawUpload, error: insertError } = await supabase
    .from('raw_uploads')
    .insert({
      org_id: member.org_id,
      uploaded_by_user_id: user.id,
      filename: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ raw_upload: rawUpload });
}
