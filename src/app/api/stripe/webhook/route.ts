/**
 * src/app/api/stripe/webhook/route.ts
 *
 * Webhook Stripe — reçoit les événements de paiement et met à jour
 * la table `subscriptions` dans Supabase via le client admin (service role).
 *
 * Événements gérés :
 *   - checkout.session.completed  → création de l'abonnement en base
 *   - customer.subscription.updated → mise à jour du statut / plan
 *   - customer.subscription.deleted → annulation de l'abonnement
 *
 * IMPORTANT : utilise req.text() (corps brut) pour la vérification de signature Stripe.
 * Ne jamais passer par req.json() ici — ça casse la vérification.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

// Client admin Supabase — service role pour bypass RLS (opérations serveur uniquement)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Corps brut requis pour la vérification de signature Stripe
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  // Vérifie que l'événement vient bien de Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      // Autres événements ignorés silencieusement
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Paiement initial validé — crée l'entrée subscriptions en base.
 * Le supabase_user_id est transmis via metadata lors du checkout.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId || !session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const plan =
    subscription.items.data[0].price.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly';

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Abonnement modifié (renouvellement, changement de plan, échec de paiement…).
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const plan =
    subscription.items.data[0].price.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly';

  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * Abonnement annulé (fin de période ou résiliation immédiate).
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
}
