import { createServerClient } from '@/lib/supabase/server';

const CATEGORY_BADGE: Record<string, string> = {
  Carrier: 'bg-blue-100 text-blue-800',
  Platform: 'bg-purple-100 text-purple-800',
  Trade: 'bg-amber-100 text-amber-800',
  Logistics: 'bg-teal-100 text-teal-800',
  Macro: 'bg-gray-100 text-gray-800',
  Tip: 'bg-green-100 text-green-800',
};

export default async function FeedPage() {
  const supabase = createServerClient();
  const { data: news } = await supabase.from('news_items')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50);

  const { data: insights } = await supabase.from('seller_insights')
    .select('*')
    .eq('user_state', 'active')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-wide">Daily Insight Feed</h1>
        <p className="text-sm text-gray-600 mt-1">
          External logistics news + insights pulled from your data.
        </p>
      </div>

      {(insights ?? []).length > 0 && (
        <section>
          <h2 className="text-sm font-mono uppercase text-gray-500 mb-2 tracking-widest">From your data</h2>
          <div className="space-y-3">
            {insights!.map((i) => (
              <div key={i.id} className="border-2 rounded-xl p-4 bg-white" style={{ borderColor: '#1A202C' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_BADGE[i.severity === 'opportunity' ? 'Tip' : 'Carrier'] ?? 'bg-gray-100'}`}>
                        {i.severity}
                      </span>
                      {i.estimated_dollar_impact_usd && (
                        <span className="text-xs font-mono text-red-700">${Number(i.estimated_dollar_impact_usd).toFixed(0)} impact</span>
                      )}
                    </div>
                    <h3 className="font-bold">{i.title}</h3>
                    <p className="text-sm text-gray-700 mt-1">{i.body}</p>
                  </div>
                </div>
                {i.recommended_action_label && i.recommended_action_deeplink && (
                  <a href={i.recommended_action_deeplink} className="mt-2 inline-block text-sm text-blue-600 underline">
                    → {i.recommended_action_label}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-mono uppercase text-gray-500 mb-2 tracking-widest">External</h2>
        {(news ?? []).length === 0 ? (
          <div className="border-2 border-dashed rounded-xl p-8 text-center text-gray-500 bg-white">
            No news yet. Check back tomorrow.
          </div>
        ) : (
          <div className="space-y-3">
            {news!.map((n) => (
              <article key={n.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_BADGE[n.category] ?? 'bg-gray-100'}`}>{n.category}</span>
                  <span className="text-xs text-gray-500">{new Date(n.published_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold">{n.headline}</h3>
                <p className="text-sm text-gray-700 mt-1">{n.summary}</p>
                {(n.source_url_primary || n.source_url_secondary) && (
                  <div className="mt-2 flex gap-3 text-xs">
                    {n.source_url_primary && <a href={n.source_url_primary} className="text-blue-600 underline" target="_blank" rel="noreferrer">Source 1</a>}
                    {n.source_url_secondary && <a href={n.source_url_secondary} className="text-blue-600 underline" target="_blank" rel="noreferrer">Source 2</a>}
                    {!n.source_url_secondary && n.category !== 'Tip' && (
                      <span className="text-amber-700">⚠ Single-source (waiting on confirmation)</span>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
