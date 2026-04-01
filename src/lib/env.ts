/**
 * src/lib/env.ts
 *
 * Validation des variables d'environnement critiques au démarrage serveur.
 * Lance une erreur explicite si une variable est absente — évite les crashes
 * silencieux en runtime (opérateur ! sans vérification).
 *
 * À importer uniquement dans les route handlers (côté serveur).
 * Ne jamais importer dans un Client Component.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  stripeSecretKey: requireEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
  stripePriceMonthly: requireEnv('STRIPE_PRICE_MONTHLY'),
  stripePriceYearly: requireEnv('STRIPE_PRICE_YEARLY'),
  appUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
};
