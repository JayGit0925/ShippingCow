import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app/AppShell';
import type { Org } from '@shippingcow/shared';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: orgMember } = await supabase
    .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single();

  let org: Org | null = null;
  if (orgMember) {
    const { data } = await supabase.from('orgs').select('*').eq('id', orgMember.org_id).single();
    org = data as Org | null;
  }

  return <AppShell org={org}>{children}</AppShell>;
}
