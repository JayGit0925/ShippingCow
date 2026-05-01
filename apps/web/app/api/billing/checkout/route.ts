import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Skeleton — wire to real Stripe when STRIPE_SECRET_KEY + STRIPE_PRICE_COW present.

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_COW) {
    return NextResponse.json(
      { error: 'Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_COW in env.' },
      { status: 503 }
    );
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { tier } = await request.json();
  if (tier !== 'cow') return NextResponse.json({ error: 'Only Cow tier upgradeable in self-serve. Bull is sales-led.' }, { status: 400 });

  // TODO: Stripe.checkout.sessions.create({...})
  return NextResponse.json({ error: 'Implementation pending — see /docs/stripe-setup.md' }, { status: 501 });
}
