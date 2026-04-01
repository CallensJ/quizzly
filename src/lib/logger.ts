/**
 * src/lib/logger.ts
 *
 * Logger centralisé — masque les détails d'erreur en production.
 * En développement : logs complets avec stack trace.
 * En production : message seul, sans exposer les objets d'erreur au serveur Vercel.
 *
 * Usage :
 *   logger.error('[checkout] Erreur:', err)   // prod → '[checkout] Erreur:'
 *   logger.info('[webhook] Event reçu:', id)  // prod → silencieux
 */

const isProd = process.env.NODE_ENV === 'production';

export const logger = {
  /** Logs de debug — silencieux en production */
  info: (...args: unknown[]): void => {
    if (!isProd) console.log(...args);
  },

  /** Erreurs — message seul en prod, détails complets en dev */
  error: (msg: string, err?: unknown): void => {
    if (isProd) {
      // En prod : on log le message uniquement — pas de stack trace ni d'objet Stripe/Supabase
      console.error(msg);
    } else {
      console.error(msg, err);
    }
  },

  /** Avertissements — toujours visibles (utile pour les alertes prod non-bloquantes) */
  warn: (msg: string): void => {
    console.warn(msg);
  },
};
