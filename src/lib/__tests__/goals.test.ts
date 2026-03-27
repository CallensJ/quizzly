// quizzly-dev/src/lib/__tests__/goals.test.ts

import { getCategoryAvg, getCategoryTrend, getGoalStatus } from '../goals';
import type { QuizSession } from '@/types';

function makeSession(
  category: QuizSession['category'],
  score: number,
  total: number,
  playedAt: string
): QuizSession {
  return { category, difficulty: 'easy', score, totalQuestions: total, playedAt };
}

const WEEK13_MON = '2026-03-23T12:00:00.000Z';
const WEEK13_FRI = '2026-03-27T12:00:00.000Z';
const WEEK12_MON = '2026-03-16T12:00:00.000Z';

describe('getCategoryAvg', () => {
  it('retourne null si aucune session', () => {
    expect(getCategoryAvg([], 'sciences')).toBeNull();
  });

  it('retourne null si aucune session pour la catégorie', () => {
    const sessions = [makeSession('histoire', 10, 20, WEEK13_MON)];
    expect(getCategoryAvg(sessions, 'sciences')).toBeNull();
  });

  it('calcule la moyenne correctement (mean de score/total*100)', () => {
    const sessions = [
      makeSession('sciences', 16, 20, WEEK13_MON),
      makeSession('sciences', 12, 20, WEEK13_FRI),
    ];
    expect(getCategoryAvg(sessions, 'sciences')).toBe(70);
  });

  it('exclut les sessions avec totalQuestions = 0', () => {
    const sessions = [
      makeSession('sciences', 0, 0, WEEK13_MON),
      makeSession('sciences', 16, 20, WEEK13_FRI),
    ];
    expect(getCategoryAvg(sessions, 'sciences')).toBe(80);
  });

  it('retourne null si toutes les sessions ont totalQuestions = 0', () => {
    const sessions = [makeSession('sciences', 0, 0, WEEK13_MON)];
    expect(getCategoryAvg(sessions, 'sciences')).toBeNull();
  });

  it('weekOnly=true filtre sur la semaine ISO courante', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-27T12:00:00.000Z').getTime());
    const sessions = [
      makeSession('sciences', 20, 20, WEEK13_MON),
      makeSession('sciences', 0, 20, WEEK12_MON),
    ];
    expect(getCategoryAvg(sessions, 'sciences', true)).toBe(100);
    jest.restoreAllMocks();
  });

  it('weekOnly=true retourne null si aucune session cette semaine', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-27T12:00:00.000Z').getTime());
    const sessions = [makeSession('sciences', 20, 20, WEEK12_MON)];
    expect(getCategoryAvg(sessions, 'sciences', true)).toBeNull();
    jest.restoreAllMocks();
  });
});

describe('getCategoryTrend', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-27T12:00:00.000Z').getTime());
  });
  afterEach(() => jest.restoreAllMocks());

  it('retourne exactement 8 entrées', () => {
    expect(getCategoryTrend([], 'sciences')).toHaveLength(8);
  });

  it('les semaines vides ont count=0 et avg=0', () => {
    getCategoryTrend([], 'sciences').forEach((w) => {
      expect(w.count).toBe(0);
      expect(w.avg).toBe(0);
    });
  });

  it('le format de la clé week est "YYYY-Www"', () => {
    getCategoryTrend([], 'sciences').forEach((w) => {
      expect(w.week).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  it('la dernière entrée est la semaine courante (W13)', () => {
    const result = getCategoryTrend([], 'sciences');
    expect(result[7].week).toBe('2026-W13');
  });

  it('la première entrée est 7 semaines avant la courante (W06)', () => {
    const result = getCategoryTrend([], 'sciences');
    expect(result[0].week).toBe('2026-W06');
  });

  it('remplit les sessions dans la bonne semaine', () => {
    const sessions = [
      makeSession('sciences', 20, 20, WEEK13_MON),
      makeSession('sciences', 10, 20, WEEK12_MON),
    ];
    const result = getCategoryTrend(sessions, 'sciences');
    const w13 = result.find((w) => w.week === '2026-W13')!;
    const w12 = result.find((w) => w.week === '2026-W12')!;
    expect(w13.count).toBe(1);
    expect(w13.avg).toBe(100);
    expect(w12.count).toBe(1);
    expect(w12.avg).toBe(50);
  });

  it('ignore les sessions hors fenêtre 8 semaines', () => {
    const sessions = [makeSession('sciences', 20, 20, '2026-01-26T12:00:00.000Z')];
    const total = getCategoryTrend(sessions, 'sciences').reduce((s, w) => s + w.count, 0);
    expect(total).toBe(0);
  });

  it("gère le changement d'année (2025-12-29 = ISO W01 2026)", () => {
    jest.restoreAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-09T12:00:00.000Z').getTime());
    const sessions = [makeSession('sciences', 20, 20, '2025-12-29T12:00:00.000Z')];
    const result = getCategoryTrend(sessions, 'sciences');
    const w01 = result.find((w) => w.week === '2026-W01');
    expect(w01).toBeDefined();
    expect(w01!.count).toBe(1);
  });
});

describe('getGoalStatus', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-27T12:00:00.000Z').getTime());
  });
  afterEach(() => jest.restoreAllMocks());

  it('retourne un tableau vide si goals est vide', () => {
    expect(getGoalStatus([], {})).toHaveLength(0);
  });

  it('retourne un GoalStatus par catégorie avec objectif', () => {
    const result = getGoalStatus([], { sciences: 70 });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('sciences');
    expect(result[0].target).toBe(70);
  });

  it('overallAvg et weekAvg sont null si aucune session', () => {
    const result = getGoalStatus([], { sciences: 70 });
    expect(result[0].overallAvg).toBeNull();
    expect(result[0].weekAvg).toBeNull();
  });

  it('calcule overallAvg et weekAvg correctement', () => {
    const sessions = [
      makeSession('sciences', 20, 20, WEEK13_MON),
      makeSession('sciences', 10, 20, WEEK12_MON),
    ];
    const result = getGoalStatus(sessions, { sciences: 70 });
    expect(result[0].overallAvg).toBe(75);
    expect(result[0].weekAvg).toBe(100);
  });

  it('trend a 8 entrées', () => {
    const result = getGoalStatus([], { sciences: 70 });
    expect(result[0].trend).toHaveLength(8);
  });
});
