import { NextResponse } from 'next/server';

// Stripe webhook — idempotent. Wire when STRIPE_WEBHOOK_SECRET present.
// Handle: checkout.session.completed, invoice.paid, customer.subscription.{created,updated,deleted}

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
  }
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });

  // TODO: stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  // → switch on event.type → upsert subscriptions row → update orgs.tier
  return NextResponse.json({ received: true, body_len: body.length });
}
