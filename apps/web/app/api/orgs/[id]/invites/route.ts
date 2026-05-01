import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { SignJWT } from 'jose';
import type { OrgMemberRole } from '@shippingcow/shared';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await request.json();
  const validRole = (role as OrgMemberRole) ?? 'member';
  if (!['admin', 'member', 'viewer'].includes(validRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from('org_members').select('role').eq('org_id', params.id).eq('user_id', user.id).single();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET ?? 'dev-secret-change-me');
  const token = await new SignJWT({ org_id: params.id, role: validRole })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('48h')
    .setIssuedAt()
    .sign(secret);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/org/invite/accept?token=${token}`;

  return NextResponse.json({ invite_url: inviteUrl });
}
