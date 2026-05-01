import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const { data: org, error } = await supabase
    .from('orgs').insert({ name, tenant_type: 'seller', tier: 'calf' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('org_members').insert({ org_id: org.id, user_id: user.id, role: 'owner' });

  return NextResponse.json({ org }, { status: 201 });
}
