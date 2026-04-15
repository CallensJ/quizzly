/**
 * src/app/api/stripe/checkout/route.ts
 *
 * Crée une session Stripe Checkout pour un abonnement mensuel ou annuel.
 * L'utilisateur doit être authentifié — le JWT est lu depuis le header Authorization.
 *
 * Sécurité :
 *   - Validation Zod du body entrant (interval)
 *   - userId lu depuis supabase.auth.getUser() — jamais depuis le body client
 *   - client_reference_id = userId (doublon de sécurité recommandé Stripe)
 *   - env vars validées au démarrage via lib/env.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { rateLimit, getIp } from '@/lib/rateLimit';

// Schéma Zod — seuls 'monthly' et 'semiannual' sont acceptés
const CheckoutBodySchema = z.object({
  interval: z.enum(['monthly', 'semiannual']),
});

export async function POST(req: NextRequest) {
  const stripe = new Stripe(env.stripeSecretKey, {
    apiVersion: '2026-03-25.dahlia',
  });

  // Client anon — vérifie le JWT entrant
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

  // Client admin — lit la table subscriptions pour récupérer le stripe_customer_id existant
  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  try {
    // 1. Rate limiting — 10 tentatives de checkout par IP par minute
    const ip = getIp(req);
    const { success, remaining, resetAt } = rateLimit(ip, 10, 60_000);
    if (!success) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessayez dans un moment.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
    logger.info('[checkout] IP:', ip, '— remaining:', remaining);

    // 2. Vérifie le JWT depuis le header Authorization: Bearer <token>
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 3. Valide le body avec Zod avant tout traitement
    const rawBody = await req.json();
    const result = CheckoutBodySchema.safeParse(rawBody);
    if (!result.success) {
      return NextResponse.json({ error: 'Paramètre interval invalide (monthly | semiannual)' }, { status: 400 });
    }

    const priceId = result.data.interval === 'semiannual'
      ? env.stripePriceSemiannual
      : env.stripePriceMonthly;

    // 4. Vérifie si l'utilisateur a déjà un abonnement actif — bloque le checkout si oui
    const { data: existing } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.status === 'active' || existing?.status === 'trialing') {
      return NextResponse.json({ error: 'Déjà abonné' }, { status: 400 });
    }

    // Réutilise le stripe_customer_id existant si disponible — évite les doublons Stripe
    const customerParam = existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: user.email };

    // 5. Crée la session Checkout Stripe
    // automatic_payment_methods laisse Stripe afficher Google Pay / Apple Pay
    // selon le device et le navigateur — ne pas hardcoder payment_method_types.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      automatic_payment_methods: { enabled: true },
      ...customerParam,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/subscribe/cancel`,
      client_reference_id: user.id,         // doublon de sécurité — lien Stripe ↔ Supabase
      metadata: {
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logger.error('[checkout] Erreur serveur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
