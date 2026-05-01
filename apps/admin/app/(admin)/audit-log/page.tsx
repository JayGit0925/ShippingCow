import { createServerClient } from '@/lib/supabase/server';
import type { AuditLogEntry } from '@shippingcow/shared';

export default async function AdminAuditLogPage() {
  const supabase = createServerClient();
  const { data: entries } = await supabase
    .from('audit_log').select('*').order('occurred_at', { ascending: false }).limit(50);
  const typedEntries = (entries ?? []) as AuditLogEntry[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">When</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Resource</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Org</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {typedEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(entry.occurred_at).toLocaleString()}</td>
                <td className="px-4 py-3"><code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{entry.action}</code></td>
                <td className="px-4 py-3 text-gray-500">{entry.resource_type}/{entry.resource_id?.slice(0, 8)}...</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{entry.org_id?.slice(0, 8)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
        {typedEntries.length === 0 && <p className="px-4 py-8 text-center text-gray-500">No audit entries yet.</p>}
      </div>
    </div>
  );
}
