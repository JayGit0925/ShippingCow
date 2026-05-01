import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  MOOOVY_CHAT_SYSTEM_PROMPT, QUERY_MY_DATA_TOOL, MOOOVY_MODELS, assertCapability,
} from '@shippingcow/shared';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { conversation_id, message } = await request.json();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const { data: member } = await supabase
    .from('org_members').select('org_id, orgs(name, tier)').eq('user_id', user.id).single();
  if (!member) return NextResponse.json({ error: 'No org' }, { status: 403 });

  try {
    await assertCapability(supabase, member.org_id, 'mooovy_turns');
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  // Get or create conversation
  let convId = conversation_id as string | undefined;
  if (!convId) {
    const { data: newConv, error: convErr } = await supabase.schema('mooovy').from('conversations')
      .insert({ org_id: member.org_id, user_id: user.id, title: message.slice(0, 60) })
      .select().single();
    if (convErr || !newConv) return NextResponse.json({ error: convErr?.message ?? 'Failed to create conversation' }, { status: 500 });
    convId = (newConv as { id: string }).id;
  }

  // Load prior messages
  const { data: priorMessages } = await supabase.schema('mooovy').from('messages')
    .select('role, content, tool_calls')
    .eq('conversation_id', convId)
    .order('created_at')
    .limit(40);

  // Persist user message
  await supabase.schema('mooovy').from('messages').insert({
    conversation_id: convId, role: 'user', content: message,
  });

  const orgInfo = member.orgs as unknown as { name: string; tier: string };
  const sys = MOOOVY_CHAT_SYSTEM_PROMPT({
    orgName: orgInfo.name,
    tier: orgInfo.tier,
    today: new Date().toISOString().slice(0, 10),
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build messages array — convert prior to Anthropic format, append new user msg
  const apiMessages: Anthropic.MessageParam[] = [
    ...((priorMessages ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    }))),
    { role: 'user', content: message },
  ];

  // Tool-use loop (max 4 iterations)
  let assistantText = '';
  const toolCalls: Array<{ name: string; input: unknown; result?: unknown }> = [];

  for (let iter = 0; iter < 4; iter++) {
    const response = await anthropic.messages.create({
      model: MOOOVY_MODELS.chat,
      max_tokens: 2000,
      system: sys,
      tools: [QUERY_MY_DATA_TOOL as unknown as Anthropic.Tool],
      messages: apiMessages,
    });

    let hadToolCall = false;
    const assistantContent: Anthropic.ContentBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text;
        assistantContent.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use' && block.name === 'query_my_data') {
        hadToolCall = true;
        const sql = (block.input as { sql: string }).sql;
        const { data: queryResult, error: queryError } = await supabase.rpc('mooovy_query', { p_sql: sql });
        const result = queryError ? { error: queryError.message } : queryResult;
        toolCalls.push({ name: 'query_my_data', input: { sql }, result });
        assistantContent.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
        apiMessages.push({ role: 'assistant', content: assistantContent });
        apiMessages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result).slice(0, 4000) }],
        });
      }
    }

    if (!hadToolCall) break;
  }

  // Persist assistant message
  await supabase.schema('mooovy').from('messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content: assistantText,
    tool_calls: toolCalls.length > 0 ? toolCalls : null,
  });

  return NextResponse.json({ conversation_id: convId, content: assistantText, tool_calls: toolCalls });
}
