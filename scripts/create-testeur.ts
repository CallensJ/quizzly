/**
 * scripts/create-testeur.ts
 *
 * Crée un compte de test "Testeur1" avec droits premium actifs,
 * sans passer par Stripe. Idempotent : relancer le script ne crée
 * pas de doublon (upsert sur l'email).
 *
 * Usage :
 *   npx tsx scripts/create-testeur.ts
 *
 * Variables d'environnement requises (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Config testeur ───────────────────────────────────────────────────────────

const TESTEUR = {
  email:    'testeur1@erudia.app',
  password: 'Testeur1!2026',
  // Abonnement premium fictif — pas de Stripe réel
  stripe_customer_id:     'test_cus_testeur1',
  stripe_subscription_id: 'test_sub_testeur1',
  plan:                   'yearly',
  // Expiration dans 10 ans
  current_period_end: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
};

async function main() {
  console.log('🚀 Création du compte testeur premium\n');

  // ── 1. Créer ou récupérer l'utilisateur auth ─────────────────────────────────
  console.log(`📧 Création du compte auth : ${TESTEUR.email}`);

  // Vérifier si l'utilisateur existe déjà via listUsers
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Impossible de lister les utilisateurs :', listError.message);
    process.exit(1);
  }

  const existing = listData.users.find((u) => u.email === TESTEUR.email);
  let userId: string;

  if (existing) {
    console.log(`  ℹ️  Utilisateur existant trouvé (id: ${existing.id})`);
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email:          TESTEUR.email,
      password:       TESTEUR.password,
      email_confirm:  true, // email pré-validé, pas besoin de confirmation
    });

    if (createError || !created.user) {
      console.error('❌ Erreur création utilisateur :', createError?.message);
      process.exit(1);
    }

    userId = created.user.id;
    console.log(`  ✅ Utilisateur créé (id: ${userId})`);
  }

  // ── 2. Upsert l'abonnement premium ───────────────────────────────────────────
  console.log('\n💎 Attribution des droits premium');

  const { error: subError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id:                userId,
        stripe_customer_id:     TESTEUR.stripe_customer_id,
        stripe_subscription_id: TESTEUR.stripe_subscription_id,
        plan:                   TESTEUR.plan,
        status:                 'active',
        current_period_end:     TESTEUR.current_period_end,
      },
      { onConflict: 'user_id' }
    );

  if (subError) {
    console.error('❌ Erreur upsert subscription :', subError.message);
    process.exit(1);
  }

  console.log('  ✅ Abonnement premium actif jusqu\'au', new Date(TESTEUR.current_period_end).toLocaleDateString('fr-FR'));

  // ── Résumé ───────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('✅ Compte testeur prêt');
  console.log(`   Email    : ${TESTEUR.email}`);
  console.log(`   Mot de passe : ${TESTEUR.password}`);
  console.log(`   User ID  : ${userId}`);
  console.log(`   Plan     : ${TESTEUR.plan} (fictif, sans Stripe)`);
  console.log('─────────────────────────────────────────');
}

main();
