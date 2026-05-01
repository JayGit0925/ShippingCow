'use client';

import { useState, useRef, useEffect } from 'react';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; input: unknown; result?: unknown }>;
}

const STARTERS = [
  "What's my dim overcharge over the last 90 days?",
  "Which SKUs are leaking the most cash?",
  "Compare FedEx vs UPS spend",
  "What's a fair zone-5 ground rate for 30 lb?",
];

export default function MooovyPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e6 }); }, [messages]);

  async function send(text: string) {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');

    const res = await fetch('/api/mooovy/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, conversation_id: convId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Failed (${res.status})`);
      setBusy(false);
      return;
    }
    const { conversation_id, content, tool_calls } = await res.json();
    setConvId(conversation_id);
    setMessages((m) => [...m, { role: 'assistant', content, toolCalls: tool_calls }]);
    setBusy(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <div className="border-b pb-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Mooovy</h1>
        <p className="text-sm text-gray-600 mt-1">Ask about your business or the world. Sharp logistics analyst on call.</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Try one of these:</p>
            <div className="grid grid-cols-2 gap-2">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm p-3 border rounded hover:border-blue-500 hover:bg-blue-50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl rounded-lg px-4 py-2 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}
              style={m.role === 'user' ? { backgroundColor: '#0052C9' } : {}}>
              <div className="text-xs font-mono uppercase mb-1 opacity-70">{m.role === 'user' ? 'You' : 'Mooovy'}</div>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              {m.toolCalls && m.toolCalls.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer opacity-70">Used {m.toolCalls.length} tool call{m.toolCalls.length === 1 ? '' : 's'}</summary>
                  <pre className="mt-1 bg-black/30 p-2 rounded text-[10px] overflow-auto max-h-40">{JSON.stringify(m.toolCalls, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        ))}

        {busy && <div className="text-sm text-gray-400 italic">Mooovy is thinking…</div>}
        {error && <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t pt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder="Ask Mooovy…"
          className="flex-1 border-2 rounded-md px-3 py-2 text-sm" />
        <button type="submit" disabled={busy || !input.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded font-medium disabled:opacity-50"
          style={{ backgroundColor: '#0052C9' }}>
          Send
        </button>
      </form>
    </div>
  );
}
