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

// Getters — évaluation différée à l'exécution (pas au build Next.js)
export const env = {
  get supabaseUrl()          { return requireEnv('NEXT_PUBLIC_SUPABASE_URL') },
  get supabaseAnonKey()      { return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
  get supabaseServiceRoleKey() { return requireEnv('SUPABASE_SERVICE_ROLE_KEY') },
  get stripeSecretKey()      { return requireEnv('STRIPE_SECRET_KEY') },
  get stripeWebhookSecret()  { return requireEnv('STRIPE_WEBHOOK_SECRET') },
  get stripePriceMonthly()      { return requireEnv('STRIPE_PRICE_MONTHLY') },
  get stripePriceSemiannual()   { return requireEnv('STRIPE_PRICE_SEMIANNUAL') },
  get appUrl()               { return requireEnv('NEXT_PUBLIC_APP_URL') },
};
