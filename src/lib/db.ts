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
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: ErudiaDB | null = null;

/**
 * Retourne l'instance Dexie (créée au premier appel côté client).
 * Retourne null en SSR pour éviter les erreurs IndexedDB côté serveur.
 */
export function getDB(): ErudiaDB | null {
  if (typeof window === 'undefined') return null;
  if (!_db) _db = new ErudiaDB();
  return _db;
}

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
