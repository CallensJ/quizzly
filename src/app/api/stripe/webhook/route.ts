/**
 * src/app/api/stripe/webhook/route.ts
 *
 * Webhook Stripe — reçoit les événements de paiement et met à jour
 * la table `subscriptions` dans Supabase via le client admin (service role).
 *
 * Événements gérés :
 *   - checkout.session.completed       → création de l'abonnement en base
 *   - customer.subscription.updated   → mise à jour du statut / plan
 *   - customer.subscription.deleted   → annulation de l'abonnement
 *   - invoice.payment_failed           → passage du statut à 'past_due'
 *
 * Sécurité :
 *   - Idempotence via table `stripe_events` (un event ne peut être traité qu'une fois)
 *   - Signature Stripe vérifiée via req.text() (raw bytes — ne jamais utiliser req.json())
 *   - Validation Zod des métadonnées avant tout accès base de données
 *   - service_role key pour les écritures Supabase (bypass RLS légitim)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit, getIp } from '@/lib/rateLimit';

// Schéma Zod — valide que le supabase_user_id est bien un UUID
const MetadataSchema = z.object({
  supabase_user_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const stripe = new Stripe(env.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  // Client admin Supabase — service role pour bypass RLS (opérations serveur uniquement)
  const supabaseAdmin = createClient(
    env.supabaseUrl,
    env.supabaseServiceRoleKey
  );

  // Rate limiting — 30 events/min par IP (Stripe envoie depuis un pool d'IPs fixe)
  const ip = getIp(req);
  const { success, resetAt } = rateLimit(ip, 30, 60_000);
  if (!success) {
    logger.warn('[webhook] Rate limit dépassé pour IP: ' + ip);
    return NextResponse.json(
      { error: 'Trop de requêtes' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  // Corps brut requis pour la vérification de signature Stripe
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  // Vérifie que l'événement vient bien de Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret);
  } catch (err) {
    logger.error('[webhook] Signature invalide:', err);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  // Idempotence — vérifie si cet event a déjà été traité
  const { data: existing } = await supabaseAdmin
    .from('stripe_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();

  if (existing) {
    // Event déjà traité — retourner 200 sans retraiter (Stripe attend toujours un 200)
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Enregistre l'event avant traitement pour éviter les doublons en cas de crash
  await supabaseAdmin
    .from('stripe_events')
    .insert({ stripe_event_id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, supabaseAdmin, session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabaseAdmin, subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseAdmin, subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseAdmin, invoice);
        break;
      }
      // Autres événements ignorés silencieusement
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Retourner 200 même en cas d'erreur métier — sinon Stripe retente indéfiniment
    logger.error('[webhook] Erreur traitement:', err);
    return NextResponse.json({ received: true, error: 'Erreur traitement interne' });
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * Paiement initial validé — crée l'entrée subscriptions en base.
 * Le supabase_user_id est transmis via metadata lors du checkout.
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const meta = MetadataSchema.safeParse(session.metadata);
  if (!meta.success || !session.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const plan =
    subscription.items.data[0].price.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly';

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: meta.data.supabase_user_id,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status,
      current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Abonnement modifié (renouvellement, changement de plan, échec de paiement…).
 */
async function handleSubscriptionUpdated(
  supabaseAdmin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  const plan =
    subscription.items.data[0].price.recurring?.interval === 'year'
      ? 'yearly'
      : 'monthly';

  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan,
      status: subscription.status,
      current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * Abonnement annulé (fin de période ou résiliation immédiate).
 */
async function handleSubscriptionDeleted(
  supabaseAdmin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * Paiement échoué — passage du statut à 'past_due'.
 * L'accès premium reste actif jusqu'à la fin de la période en cours.
 * Stripe retente automatiquement le paiement selon la config du dashboard.
 */
async function handlePaymentFailed(
  supabaseAdmin: SupabaseClient,
  invoice: Stripe.Invoice
) {
  // API 2026-03-25.dahlia : invoice.subscription supprimé — désormais dans invoice.parent.subscription_details.subscription
  const subscriptionId = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId as string);
}
