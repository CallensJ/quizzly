/**
 * src/lib/__tests__/difficulty.test.ts
 *
 * Tests unitaires de la progression de difficulté (cahier-des-charges-claude-v1.4.md §3).
 *
 * Ce qu'on teste :
 *   - promotion Facile → Moyen (≥80% sur 3 parties consécutives)
 *   - promotion Moyen → Difficile (≥90% sur 3 parties consécutives, requiert Moyen débloqué)
 *   - le déblocage est un cliquet permanent (ne se reprend pas après une mauvaise partie)
 *   - justUnlockedDifficulty ne déclenche qu'au moment précis du déblocage
 *   - suggestion de rétrogradation (<40% sur 2 parties consécutives), réévaluée à chaque partie
 *   - isolation stricte par catégorie
 *
 * Aucun mock nécessaire — fonctions pures sur QuizSession[].
 */

import {
  isMediumUnlocked,
  isHardUnlocked,
  isDifficultyUnlocked,
  getUnlockedDifficulties,
  justUnlockedDifficulty,
  shouldSuggestDemotion,
  lowerDifficulty,
} from '../difficulty';
import type { Category, Difficulty, QuizSession } from '@/types';

const CAT: Category = 'espace';
const OTHER_CAT: Category = 'dinosaures';

function session(
  difficulty: Difficulty,
  score: number,
  totalQuestions: number,
  playedAt: string,
  category: Category = CAT
): QuizSession {
  return { category, difficulty, score, totalQuestions, playedAt };
}

describe('isMediumUnlocked', () => {
  it('retourne false sans historique', () => {
    expect(isMediumUnlocked([], CAT)).toBe(false);
  });

  it('retourne true après 3 parties consécutives ≥80% en Facile', () => {
    const sessions = [
      session('easy', 8, 10, '2026-01-01'),
      session('easy', 9, 10, '2026-01-02'),
      session('easy', 8, 10, '2026-01-03'),
    ];
    expect(isMediumUnlocked(sessions, CAT)).toBe(true);
  });

  it('retourne false si une des 3 dernières parties est sous 80%', () => {
    const sessions = [
      session('easy', 8, 10, '2026-01-01'),
      session('easy', 7, 10, '2026-01-02'),
      session('easy', 8, 10, '2026-01-03'),
    ];
    expect(isMediumUnlocked(sessions, CAT)).toBe(false);
  });

  it('reste débloqué même après une mauvaise partie ultérieure (cliquet permanent)', () => {
    const sessions = [
      session('easy', 8, 10, '2026-01-01'),
      session('easy', 9, 10, '2026-01-02'),
      session('easy', 8, 10, '2026-01-03'),
      session('easy', 2, 10, '2026-01-04'),
    ];
    expect(isMediumUnlocked(sessions, CAT)).toBe(true);
  });

  it('est isolé par catégorie', () => {
    const sessions = [
      session('easy', 8, 10, '2026-01-01'),
      session('easy', 9, 10, '2026-01-02'),
      session('easy', 8, 10, '2026-01-03'),
    ];
    expect(isMediumUnlocked(sessions, OTHER_CAT)).toBe(false);
  });
});

describe('isHardUnlocked', () => {
  const mediumUnlockedSessions = [
    session('easy', 8, 10, '2026-01-01'),
    session('easy', 9, 10, '2026-01-02'),
    session('easy', 8, 10, '2026-01-03'),
  ];

  it('retourne false si Moyen lui-même est verrouillé, même avec de bons scores en Moyen', () => {
    // Aucune partie Facile jouée — Moyen n'est théoriquement pas censé être accessible,
    // mais on vérifie que la fonction ne se laisse pas abuser par le seul historique Moyen.
    const sessions = [
      session('medium', 9, 10, '2026-01-05'),
      session('medium', 10, 10, '2026-01-06'),
      session('medium', 9, 10, '2026-01-07'),
    ];
    expect(isHardUnlocked(sessions, CAT)).toBe(false);
  });

  it('retourne true après 3 parties consécutives ≥90% en Moyen, une fois Moyen débloqué', () => {
    const sessions = [
      ...mediumUnlockedSessions,
      session('medium', 9, 10, '2026-01-05'),
      session('medium', 10, 10, '2026-01-06'),
      session('medium', 9, 10, '2026-01-07'),
    ];
    expect(isHardUnlocked(sessions, CAT)).toBe(true);
  });

  it('retourne false si le seuil Moyen est atteint mais pas à 90%', () => {
    const sessions = [
      ...mediumUnlockedSessions,
      session('medium', 8, 10, '2026-01-05'),
      session('medium', 9, 10, '2026-01-06'),
      session('medium', 8, 10, '2026-01-07'),
    ];
    expect(isHardUnlocked(sessions, CAT)).toBe(false);
  });
});

describe('isDifficultyUnlocked / getUnlockedDifficulties', () => {
  it('Facile est toujours débloqué', () => {
    expect(isDifficultyUnlocked([], CAT, 'easy')).toBe(true);
  });

  it('getUnlockedDifficulties ne retourne que Facile sans historique', () => {
    expect(getUnlockedDifficulties([], CAT)).toEqual(['easy']);
  });

  it('getUnlockedDifficulties retourne les 3 niveaux une fois tout débloqué', () => {
    const sessions = [
      session('easy', 8, 10, '2026-01-01'),
      session('easy', 9, 10, '2026-01-02'),
      session('easy', 8, 10, '2026-01-03'),
      session('medium', 9, 10, '2026-01-05'),
      session('medium', 10, 10, '2026-01-06'),
      session('medium', 9, 10, '2026-01-07'),
    ];
    expect(getUnlockedDifficulties(sessions, CAT)).toEqual(['easy', 'medium', 'hard']);
  });
});

describe('justUnlockedDifficulty', () => {
  const sessions = [
    session('easy', 8, 10, '2026-01-01'),
    session('easy', 9, 10, '2026-01-02'),
    session('easy', 8, 10, '2026-01-03'),
  ];

  it('retourne true si la dernière partie vient de déclencher le déblocage', () => {
    expect(justUnlockedDifficulty(sessions, CAT, 'medium')).toBe(true);
  });

  it('retourne false avant que la 3e partie ne soit jouée', () => {
    expect(justUnlockedDifficulty(sessions.slice(0, -1), CAT, 'medium')).toBe(false);
  });

  it('retourne false si le niveau était déjà débloqué avant cette partie', () => {
    const withOneMore = [...sessions, session('easy', 9, 10, '2026-01-04')];
    expect(justUnlockedDifficulty(withOneMore, CAT, 'medium')).toBe(false);
  });

  it('retourne false sur un historique vide', () => {
    expect(justUnlockedDifficulty([], CAT, 'medium')).toBe(false);
  });
});

describe('shouldSuggestDemotion', () => {
  it('ne suggère jamais de rétrograder sous Facile', () => {
    const sessions = [
      session('easy', 1, 10, '2026-02-01'),
      session('easy', 1, 10, '2026-02-02'),
    ];
    expect(shouldSuggestDemotion(sessions, CAT, 'easy')).toBe(false);
  });

  it('suggère après 2 parties consécutives <40%', () => {
    const sessions = [
      session('hard', 2, 10, '2026-02-01'),
      session('hard', 3, 10, '2026-02-02'),
    ];
    expect(shouldSuggestDemotion(sessions, CAT, 'hard')).toBe(true);
  });

  it('ne suggère pas après une seule mauvaise partie', () => {
    const sessions = [session('hard', 2, 10, '2026-02-01')];
    expect(shouldSuggestDemotion(sessions, CAT, 'hard')).toBe(false);
  });

  it('une bonne partie entre deux mauvaises annule la suggestion', () => {
    const sessions = [
      session('hard', 2, 10, '2026-02-01'),
      session('hard', 9, 10, '2026-02-02'),
      session('hard', 3, 10, '2026-02-03'),
    ];
    expect(shouldSuggestDemotion(sessions, CAT, 'hard')).toBe(false);
  });

  it("s'applique aussi au niveau Moyen", () => {
    const sessions = [
      session('medium', 1, 10, '2026-02-01'),
      session('medium', 3, 10, '2026-02-02'),
    ];
    expect(shouldSuggestDemotion(sessions, CAT, 'medium')).toBe(true);
  });
});

describe('lowerDifficulty', () => {
  it('Difficile → Moyen', () => {
    expect(lowerDifficulty('hard')).toBe('medium');
  });

  it('Moyen → Facile', () => {
    expect(lowerDifficulty('medium')).toBe('easy');
  });

  it('Facile reste Facile (pas de niveau inférieur)', () => {
    expect(lowerDifficulty('easy')).toBe('easy');
  });
});
