import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { jwtVerify } from 'jose';

export async function POST(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 });

  try {
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? 'dev-secret-change-me');
    const { payload } = await jwtVerify(token, secret);
    const orgId = payload.org_id as string;
    const role = payload.role as string;
    if (!orgId || !role) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    const { data: existing } = await supabase
      .from('org_members').select('user_id').eq('org_id', orgId).eq('user_id', user.id).single();

    if (existing) return NextResponse.json({ org_id: orgId, already_member: true });

    const { error } = await supabase
      .from('org_members').insert({ org_id: orgId, user_id: user.id, role });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ org_id: orgId });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }
}
