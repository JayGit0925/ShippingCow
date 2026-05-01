import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InviteGenerator } from '@/components/app/InviteGenerator';
import type { Org } from '@shippingcow/shared';

export default async function OrgSettingsPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('org_members').select('org_id, role').eq('user_id', user.id).limit(1).single();

  if (!membership) {
    return <div className="text-center py-12"><p className="text-gray-600">No organization found.</p></div>;
  }

  const { data: org } = await supabase.from('orgs').select('*').eq('id', membership.org_id).single();
  const { data: members } = await supabase.from('org_members').select('*').eq('org_id', membership.org_id);
  const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin';
  const typedOrg = org as Org | null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
      <div className="mt-6 space-y-6">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900">Details</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{typedOrg?.name}</dd></div>
            <div><dt className="text-gray-500">Tier</dt><dd className="font-medium capitalize">{typedOrg?.tier}</dd></div>
            <div><dt className="text-gray-500">Created</dt><dd className="font-medium">{typedOrg?.created_at ? new Date(typedOrg.created_at).toLocaleDateString() : '—'}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900">Members ({members?.length ?? 0})</h3>
          <ul className="mt-3 divide-y">
            {(members ?? []).map((m: any) => (
              <li key={m.user_id} className="flex items-center justify-between py-2">
                <span className="text-sm font-mono text-gray-600">{m.user_id.slice(0, 12)}...</span>
                <span className="text-xs font-medium uppercase text-gray-500">{m.role}</span>
              </li>
            ))}
          </ul>
        </div>
        {isOwnerOrAdmin && typedOrg && <InviteGenerator orgId={typedOrg.id} />}
      </div>
    </div>
  );
}
