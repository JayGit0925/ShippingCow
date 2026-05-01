import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ReviewClient } from './ReviewClient';

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: pr } = await supabase.from('parsed_records').select('*').eq('id', id).single();
  if (!pr) notFound();

  const { data: rawUpload } = await supabase
    .from('raw_uploads').select('filename, mime_type, size_bytes').eq('id', pr.raw_upload_id).single();

  return (
    <ReviewClient
      parsedRecordId={pr.id}
      payload={pr.parsed_payload as { rows: Record<string, unknown>[]; headers: string[]; mapping: Record<string, string | null>; raw_sample: Record<string, unknown>[] }}
      confidence={pr.confidence_score}
      status={pr.status}
      filename={rawUpload?.filename ?? 'unknown'}
    />
  );
}
