/**
 * src/app/api/account/delete/route.ts
 *
 * Route DELETE — suppression complète du compte parent.
 * Ordre : annuler l'abonnement Stripe (si actif) → supprimer Supabase données → supprimer Auth user.
 *
 * Sécurité : le token JWT est vérifié via Supabase Admin avant toute opération.
 * Service role uniquement — bypass RLS légitime pour la suppression de données propres.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export async function DELETE(req: NextRequest) {
  const supabaseAdmin = createAdminClient();

  // Vérifier l'authentification via le token JWT
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Récupérer l'abonnement Stripe si actif
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  // Annuler l'abonnement Stripe si actif
  // On continue même si Stripe échoue — les données Supabase sont supprimées dans tous les cas
  if (sub?.stripe_subscription_id && sub.status === 'active') {
    try {
      const stripe = new Stripe(env.stripeSecretKey, { apiVersion: '2026-03-25.dahlia' });
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch {
      // Silencieux — l'abonnement sera annulé par le webhook ou expirera naturellement
    }
  }

  // Supprimer les données Supabase dans l'ordre : subscriptions → admin_settings → profiles → auth user
  await supabaseAdmin.from('subscriptions').delete().eq('user_id', user.id);
  await supabaseAdmin.from('admin_settings').delete().eq('user_id', user.id);
  await supabaseAdmin.from('profiles').delete().eq('auth_user_id', user.id);
  await supabaseAdmin.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true });
}
