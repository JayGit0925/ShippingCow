import { createServerClient } from '@/lib/supabase/server';

export default async function AdminUsersPage() {
  const supabase = createServerClient();
  const { data: members } = await supabase
    .from('org_members').select('org_id, user_id, role')
    .order('created_at', { ascending: false }).limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Org</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(members ?? []).map((m: any) => (
              <tr key={`${m.org_id}-${m.user_id}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.user_id}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.org_id.slice(0, 8)}...</td>
                <td className="px-4 py-3"><span className="text-xs font-medium uppercase text-gray-600">{m.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!members || members.length === 0) && <p className="px-4 py-8 text-center text-gray-500">No users yet.</p>}
      </div>
    </div>
  );
}
