import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { MOOOVY_PARSE_SYSTEM_PROMPT, EMIT_SHIPMENTS_TOOL, MOOOVY_MODELS, assertCapability } from '@shippingcow/shared';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. Set in apps/web/.env.local to enable Mooovy parse.' },
      { status: 503 }
    );
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { raw_upload_id } = await request.json();
  if (!raw_upload_id) return NextResponse.json({ error: 'raw_upload_id required' }, { status: 400 });

  const { data: rawUpload } = await supabase
    .from('raw_uploads').select('*').eq('id', raw_upload_id).single();
  if (!rawUpload) return NextResponse.json({ error: 'Upload not found' }, { status: 404 });

  const { data: member } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 403 });

  // Tier gate: Mooovy parse counts as a turn
  try {
    await assertCapability(supabase, member.org_id, 'mooovy_turns');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  // Download file
  const { data: fileBlob, error: dlError } = await supabase.storage
    .from('raw-uploads').download(rawUpload.storage_path);
  if (dlError || !fileBlob) return NextResponse.json({ error: dlError?.message ?? 'Download failed' }, { status: 500 });

  const buffer = await fileBlob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mime = rawUpload.mime_type ?? 'application/pdf';

  // Build content block — vision for image, document for PDF
  type ContentBlock =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
    | { type: 'text'; text: string };

  let docBlock: ContentBlock;
  if (mime.startsWith('image/')) {
    docBlock = { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };
  } else if (mime === 'application/pdf') {
    docBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  } else {
    return NextResponse.json({ error: `Mooovy parse handles PDF/image only. Use /api/ingestion/parse for ${mime}.` }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let toolUseRows: unknown[] | null = null;
  let summaryText = '';

  try {
    const response = await anthropic.messages.create({
      model: MOOOVY_MODELS.chat,
      max_tokens: 8000,
      system: MOOOVY_PARSE_SYSTEM_PROMPT,
      tools: [EMIT_SHIPMENTS_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: 'emit_shipments' },
      messages: [{
        role: 'user',
        content: [
          docBlock as Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam,
          { type: 'text', text: 'Parse all shipments in this document. Call emit_shipments once with everything.' },
        ],
      }],
    });

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'emit_shipments') {
        const input = block.input as { rows: unknown[] };
        toolUseRows = input.rows;
      } else if (block.type === 'text') {
        summaryText += block.text;
      }
    }
  } catch (e) {
    return NextResponse.json({ error: `Anthropic call failed: ${(e as Error).message}` }, { status: 500 });
  }

  if (!toolUseRows) {
    return NextResponse.json({ error: 'Mooovy did not emit shipments. Try a different file.' }, { status: 422 });
  }

  // Persist parsed_records (auto-expires in 24h)
  const { data: pr, error: prError } = await supabase
    .from('parsed_records')
    .insert({
      raw_upload_id,
      org_id: member.org_id,
      schema_type: 'shipments',
      parsed_payload: {
        rows: toolUseRows,
        headers: ['date','sku','category','cost_per_package','packages_shipped','length_in','width_in','height_in','origin_zip','destination_zip','actual_weight_lb','billable_weight_lb','carrier','selling_platform'],
        mapping: {},
        raw_sample: [],
        mooovy_summary: summaryText,
      },
      confidence_score: 0.85,  // vision parse is high-confidence by design
      status: 'pending',
    })
    .select()
    .single();

  if (prError) return NextResponse.json({ error: prError.message }, { status: 500 });

  return NextResponse.json({
    parsed_record_id: pr.id,
    row_count: toolUseRows.length,
    summary: summaryText,
    sample_rows: toolUseRows.slice(0, 5),
  });
}
