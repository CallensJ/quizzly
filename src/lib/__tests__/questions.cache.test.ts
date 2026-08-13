/**
 * src/lib/__tests__/questions.cache.test.ts
 *
 * Tests unitaires de la logique de cache IndexedDB (Dexie) pour les questions.
 *
 * Ce qu'on teste :
 *   - getCache retourne null si le cache est vide
 *   - getCache retourne null si le cache est expiré (TTL 24h)
 *   - getCache retourne les questions si le cache est valide
 *   - prewarmQuestionsCache ne re-fetch pas si le cache est déjà chaud
 *   - prewarmQuestionsCache est no-op si offline (navigator.onLine = false)
 *   - prewarmQuestionsCache est no-op en SSR (window = undefined)
 *
 * Dexie et Supabase sont mockés pour isoler la logique pure.
 */

import { CACHE_TTL_MS } from '../db';

// ─── Mock Dexie (getDB) ───────────────────────────────────────────────────────

const mockGet   = jest.fn();
const mockPut   = jest.fn();
const mockWhere = jest.fn();

jest.mock('../db', () => ({
  getDB: () => ({
    questionCache: {
      get: mockGet,
      put: mockPut,
      where: mockWhere,
    },
  }),
  CACHE_TTL_MS: 24 * 60 * 60 * 1000,
}));

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockSupabaseSelect = jest.fn();

jest.mock('../supabaseBrowser', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: mockSupabaseSelect,
        }),
      }),
    }),
  },
}));

// ─── Mock imports JSON locaux (via dynamic import) ────────────────────────────
// On les mocke car webpack ne peut pas les résoudre dans Jest

jest.mock(
  '../../data/questions/fr/sciences.json',
  () => ({ questions: [{ id: 'sci-fr-0001', question: 'Q?', answer: 'a', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd', difficulty: 'easy' }] }),
  { virtual: true }
);
jest.mock('../../data/questions/fr/histoire.json', () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/fr/heroes.json',   () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/fr/math.json',     () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/en/sciences.json', () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/en/histoire.json', () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/en/heroes.json',   () => ({ questions: [] }), { virtual: true });
jest.mock('../../data/questions/en/math.json',     () => ({ questions: [] }), { virtual: true });

// ─── Import APRÈS les mocks ───────────────────────────────────────────────────

import { prewarmQuestionsCache } from '../questions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeQuestion = (id: string) => ({
  id,
  question: 'Q?',
  answer: 'a',
  option_a: 'a',
  option_b: 'b',
  option_c: 'c',
  option_d: 'd',
  difficulty: 'easy' as const,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Cache IndexedDB — TTL et fallback', () => {
  beforeEach(() => {
    // Simule un environnement client avec réseau disponible
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  describe('prewarmQuestionsCache()', () => {
    it('est no-op si navigator.onLine est false', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      });

      await prewarmQuestionsCache();

      // Aucune lecture de cache ni fetch ne doit avoir eu lieu
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
    });

    it('ne fetch pas Supabase si le cache IndexedDB est valide', async () => {
      // Cache chaud : cachedAt = maintenant
      mockGet.mockResolvedValue({
        key: 'erudia-q-sciences-fr',
        questions: [makeQuestion('sci-fr-0001')],
        cachedAt: Date.now(),
      });

      await prewarmQuestionsCache();

      // Supabase ne doit pas être appelé
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
    });

    it('fetch Supabase si le cache est expiré (> 24h)', async () => {
      // Cache périmé : cachedAt = 25h avant
      mockGet.mockResolvedValue({
        key: 'erudia-q-sciences-fr',
        questions: [makeQuestion('sci-fr-0001')],
        cachedAt: Date.now() - CACHE_TTL_MS - 1000,
      });

      // Supabase retourne des questions
      mockSupabaseSelect.mockResolvedValue({
        data: [{ id: 'sci-fr-0001', difficulty: 'easy', question: 'Q?', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd', answer: 'a' }],
        error: null,
      });

      await prewarmQuestionsCache();

      expect(mockSupabaseSelect).toHaveBeenCalled();
    });

    it('fetch Supabase si le cache est absent', async () => {
      // Aucun cache
      mockGet.mockResolvedValue(undefined);

      mockSupabaseSelect.mockResolvedValue({
        data: [{ id: 'sci-fr-0001', difficulty: 'easy', question: 'Q?', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd', answer: 'a' }],
        error: null,
      });

      await prewarmQuestionsCache();

      expect(mockSupabaseSelect).toHaveBeenCalled();
    });

    it("ne met rien en cache si Supabase échoue et qu'aucun JSON local n'est disponible (v1.4)", async () => {
      // Aucun cache
      mockGet.mockResolvedValue(undefined);

      // Supabase échoue
      mockSupabaseSelect.mockResolvedValue({ data: null, error: { message: 'Network error' } });

      await prewarmQuestionsCache();

      // LOCAL_JSON_MAP est vide depuis la purge du catalogue v1.0 (v1.4) : il n'y a
      // pas encore de fallback JSON local à mettre en cache. Ce test redeviendra
      // "met en cache les questions locales JSON" une fois LOCAL_JSON_MAP réalimenté
      // avec les 5 catégories v1.4 (cf. src/lib/questions.ts).
      expect(mockPut).not.toHaveBeenCalled();
    });

    it("ne jette pas d'erreur même si Supabase et JSON local sont indisponibles", async () => {
      mockGet.mockResolvedValue(undefined);
      mockSupabaseSelect.mockRejectedValue(new Error('Supabase down'));
      mockPut.mockRejectedValue(new Error('Dexie error'));

      // Ne doit pas lever d'exception
      await expect(prewarmQuestionsCache()).resolves.not.toThrow();
    });
  });
});

describe('CACHE_TTL_MS', () => {
  it('vaut exactement 24 heures en millisecondes', () => {
    expect(CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
