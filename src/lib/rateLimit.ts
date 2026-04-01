/**
 * src/lib/rateLimit.ts
 *
 * Rate limiter en mémoire pour les routes API Stripe.
 * Limite les requêtes par adresse IP sur une fenêtre glissante.
 *
 * ⚠️ Limitations de l'implémentation en mémoire :
 *   - Le compteur se réinitialise à chaque cold start Vercel (fonctions serverless)
 *   - Ne partage pas l'état entre plusieurs instances simultanées
 *   - Suffisant pour le MVP — protège contre les abus simples et les bots lents
 *
 * TODO MVP 5 : migrer vers @upstash/ratelimit + @upstash/redis pour une protection
 * stateful cross-instances. Requiert UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *
 * Usage :
 *   const { success, remaining } = rateLimit(ip, 10, 60_000) // 10 req/min
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Singleton en mémoire — partagé entre les appels dans la même instance serverless
const store = new Map<string, RateLimitEntry>();

/**
 * Vérifie si une IP peut effectuer une requête.
 * @param ip        Adresse IP de la requête
 * @param limit     Nombre max de requêtes autorisées
 * @param windowMs  Durée de la fenêtre en millisecondes
 */
export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(ip);

  // Nouvelle fenêtre ou IP inconnue
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(ip, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  // Quota dépassé
  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Incrémente le compteur
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extrait l'IP depuis les headers Next.js (compatible Vercel).
 * Fallback sur '127.0.0.1' si aucun header disponible.
 */
export function getIp(req: Request): string {
  return (
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
