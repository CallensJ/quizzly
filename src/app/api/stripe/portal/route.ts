/**
 * src/app/api/stripe/portal/route.ts
 *
 * Crée une session Stripe Customer Portal.
 * Permet à l'abonné de gérer son abonnement (annuler, changer de CB,
 * voir les factures) directement depuis Stripe, sans développement custom.
 *
 * Prérequis : le Customer Portal doit être activé dans le dashboard Stripe
 * Settings → Billing → Customer portal.
 *
 * Sécurité :
 *   - userId lu depuis supabase.auth.getUser() — jamais depuis le body client
 *   - env vars validées au démarrage via lib/env.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit, getIp } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const stripe = new Stripe(env.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  try {
    // 1. Rate limiting — 5 ouvertures du portal par IP par minute
    const ip = getIp(req);
    const { success, resetAt } = rateLimit(ip, 5, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessayez dans un moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)) },
        }
      );
    }

    // 2. Vérifie le JWT
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 3. Récupère le stripe_customer_id depuis Supabase
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 });
    }

    // 4. Crée la session Customer Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${env.appUrl}/admin`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('[portal] Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
