import { createServerClient } from '@/lib/supabase/server';
import type { Org } from '@shippingcow/shared';

export default async function AdminOrgsPage() {
  const supabase = createServerClient();
  const { data: orgs } = await supabase
    .from('orgs').select('*').order('created_at', { ascending: false });
  const typedOrgs = (orgs ?? []) as Org[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Tier</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {typedOrgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                <td className="px-4 py-3 text-gray-500">{org.tenant_type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    org.tier === 'bull' ? 'bg-purple-100 text-purple-700' :
                    org.tier === 'cow' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{org.tier}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(org.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {typedOrgs.length === 0 && <p className="px-4 py-8 text-center text-gray-500">No organizations yet.</p>}
      </div>
    </div>
  );
}
