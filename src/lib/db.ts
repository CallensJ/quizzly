/**
 * src/lib/db.ts
 *
 * Base de données locale IndexedDB via Dexie.
 * Remplace le cache questions localStorage (erudia-q-*) et ajoute
 * une file de sync offline (mutations en attente de connexion).
 *
 * Tables :
 *   - questionCache  : cache des questions par (category, locale) — TTL 24h
 *   - pendingSyncs   : mutations locales en attente de sync Supabase
 *
 * Singleton lazy — null côté serveur (SSR Next.js).
 */

import Dexie, { type Table } from 'dexie';
import type { Question } from '@/types';

// ─── Schémas ──────────────────────────────────────────────────────────────────

export interface QCacheEntry {
  key: string;          // erudia-q-{category}-{locale}
  questions: Question[];
  cachedAt: number;     // timestamp ms (pour TTL)
}

export type PendingSyncType = 'session' | 'profile';

export interface PendingSync {
  id?: number;          // autoincrement (clé primaire)
  type: PendingSyncType;
  deviceId: string;
  profileId?: string;   // UUID local du profil enfant (absent dans les anciens items)
  payload: unknown;
  createdAt: number;    // timestamp ms
}

// ─── Classe Dexie ─────────────────────────────────────────────────────────────

class ErudiaDB extends Dexie {
  questionCache!: Table<QCacheEntry, string>;
  pendingSyncs!: Table<PendingSync, number>;

  constructor() {
    super('erudia-db');
    this.version(1).stores({
      questionCache: 'key, cachedAt',
      pendingSyncs:  '++id, type, createdAt',
    });
    // Libérer le verrou si une autre connexion demande un upgrade de version
    // (ex: nouvel onglet, rechargement SW). Sans ça → AbortError "steal".
    this.on('versionchange', () => {
      this.close();
      delete (globalThis as typeof globalThis & { __erudiaDb?: ErudiaDB }).__erudiaDb;
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

// Stocké dans globalThis pour survivre aux rechargements HMR (Next.js dev).
// Sans ça, chaque HMR crée une nouvelle connexion pendant que l'ancienne
// est encore ouverte → AbortError "Lock broken by another request".
const g = globalThis as typeof globalThis & { __erudiaDb?: ErudiaDB };

/**
 * Retourne l'instance Dexie (créée au premier appel côté client).
 * Retourne null en SSR pour éviter les erreurs IndexedDB côté serveur.
 */
export function getDB(): ErudiaDB | null {
  if (typeof window === 'undefined') return null;
  if (!g.__erudiaDb || !g.__erudiaDb.isOpen()) {
    g.__erudiaDb = new ErudiaDB();
  }
  return g.__erudiaDb;
}

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
