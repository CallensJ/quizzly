// src/stores/profileStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, QuizSession, Locale } from '@/types';
import {
  calculateDailyXp,
  getDailyDateString,
  SHIELD_EVERY_N_DAYS,
  MAX_SHIELDS,
} from '@/lib/daily';
import type { ReportSchedule } from '@/lib/report';

// Résultat retourné par completeDailyChallenge — utilisé par ResultsScreen pour l'affichage
export interface DailyResult {
  xpGained: number;
  newStreak: number;
  shieldUsed: boolean;
  shieldEarned: boolean;
  newBadgeIds: string[];
}

interface ProfileState {
  profile: Profile | null;
  sessions: QuizSession[];
  // Identifiant unique du device — généré à l'onboarding, utilisé pour la sync Supabase sans auth
  deviceId: string | null;
  // Préférences persistées séparément du profil — indépendantes des données joueur
  timerEnabled: boolean;
  soundEnabled: boolean;
  // Mode Admin — accès parent/enseignant protégé par PIN
  adminPin: string | null;       // null = pas encore défini
  adminEmail: string | null;     // email adulte pour notifications futures (MVP 3)
  dailyGoal: number | null;      // objectif journalier (bonnes réponses), null = désactivé

  // ── Mode multijoueur — accès conditionné à l'autorisation parent (MVP 4) ──
  // Débloqué une fois via le mode admin (PIN). False par défaut.
  multiplayerUnlocked: boolean;

  // ── Rapports de progression PDF (MVP 4) ────────────────────────────────────
  // Fréquence d'envoi automatique — 'none' par défaut (désactivé).
  // Synced vers admin_settings.report_schedule pour le cron Supabase.
  reportSchedule: ReportSchedule;

  // ── Système de badges étendu (MVP 4) ─────────────────────────────────────
  // Source de vérité : liste des IDs de badges obtenus (persistée)
  earnedBadgeIds: string[];
  // Badges gagnés lors de la dernière session uniquement (non persisté — reset au rechargement)
  newBadgesThisSession: string[];

  // ── Mode Défi Quotidien (MVP 4) ────────────────────────────────────────────
  // Tout persisté en localStorage — pas de table Supabase nécessaire.
  dailyStreak: number;           // jours consécutifs complétés
  dailyLastDate: string | null;  // YYYY-MM-DD de la dernière complétion
  dailyXp: number;               // XP total accumulé (système de titres)
  dailyShields: number;          // boucliers disponibles (max 2, protège le streak)
  dailyTodayScore: number | null; // score du jour (null = pas encore joué)

  setMultiplayerUnlocked: (enabled: boolean) => void;
  setReportSchedule: (schedule: ReportSchedule) => void;
  /**
   * Enregistre la complétion du défi quotidien.
   * Met à jour le streak (avec gestion du shield si 1 jour manqué),
   * ajoute les XP, vérifie les badges streak, retourne le résultat pour l'affichage.
   */
  completeDailyChallenge: (score: number, total: number) => DailyResult;
  createProfile: (data: Omit<Profile, 'createdAt'>) => void;
  setLocale: (locale: Locale) => void;
  updateAvatar: (avatarId: string, avatarStyle?: string) => void;
  setTimerEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAdminPin: (pin: string) => void;
  setAdminEmail: (email: string | null) => void;
  setDailyGoal: (goal: number | null) => void;
  addSession: (session: Omit<QuizSession, 'playedAt'>) => void;
  // Remplace earnBadge() — accepte plusieurs IDs, met à jour earned + newBadgesThisSession
  awardBadges: (ids: string[]) => void;
  // Vide les badges de la session courante (appelé au reset)
  clearNewBadges: () => void;
  earnBadge: () => void; // conservé pour rétro-compat Supabase sync — délègue à awardBadges
  resetProgress: () => void;
  deleteProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      sessions: [],
      deviceId: null,
      timerEnabled: false,
      multiplayerUnlocked: false,
      reportSchedule: 'none',
      soundEnabled: true, // activé par défaut — les enfants apprécient le feedback sonore
      adminPin: null,
      adminEmail: null,
      dailyGoal: null,
      earnedBadgeIds: [],
      // newBadgesThisSession n'est pas persisté (exclu via partialize ci-dessous)
      newBadgesThisSession: [],
      // Daily challenge — état initial
      dailyStreak: 0,
      dailyLastDate: null,
      dailyXp: 0,
      dailyShields: 0,
      dailyTodayScore: null,

      createProfile: (data) =>
        set({
          // Génère un deviceId unique à la création du profil (UUID v4 natif)
          deviceId: crypto.randomUUID(),
          profile: {
            ...data,
            createdAt: new Date().toISOString(),
          },
        }),

      setLocale: (locale) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, locale } : null,
        })),

      updateAvatar: (avatarId, avatarStyle) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, avatarId, ...(avatarStyle !== undefined ? { avatarStyle } : {}) }
            : null,
        })),

      setMultiplayerUnlocked: (enabled) => set({ multiplayerUnlocked: enabled }),

      setReportSchedule: (schedule) => set({ reportSchedule: schedule }),

      completeDailyChallenge: (score, total) => {
        const state = get();
        const today = getDailyDateString();
        const last  = state.dailyLastDate;

        // Calcul du nouveau streak ─────────────────────────────────────────────
        // On détermine le nombre de jours depuis la dernière complétion
        let daysSinceLast = Infinity;
        if (last) {
          const msPerDay = 86_400_000;
          daysSinceLast = Math.round(
            (new Date(today).getTime() - new Date(last).getTime()) / msPerDay
          );
        }

        let newStreak = state.dailyStreak;
        let shieldUsed = false;

        if (daysSinceLast === 1) {
          // Jour consécutif — streak + 1
          newStreak = state.dailyStreak + 1;
        } else if (daysSinceLast === 2 && state.dailyShields > 0) {
          // 1 jour manqué + bouclier disponible → streak préservé
          newStreak = state.dailyStreak + 1;
          shieldUsed = true;
        } else if (daysSinceLast === Infinity || daysSinceLast > (state.dailyShields > 0 ? 2 : 1)) {
          // Streak cassé (ou premier défi)
          newStreak = 1;
        }

        // Calcul XP ────────────────────────────────────────────────────────────
        const xpGained = calculateDailyXp(newStreak, score, total);
        const newXp = state.dailyXp + xpGained;

        // Shield earned : un bouclier gagné quand le streak atteint un multiple de 7
        const shieldEarned =
          newStreak > 0 &&
          newStreak % SHIELD_EVERY_N_DAYS === 0 &&
          state.dailyShields < MAX_SHIELDS;

        const newShields = Math.min(
          (shieldUsed ? state.dailyShields - 1 : state.dailyShields) +
          (shieldEarned ? 1 : 0),
          MAX_SHIELDS
        );

        // Badges streak ────────────────────────────────────────────────────────
        const newBadgeIds: string[] = [];
        const streakBadges = [
          { id: 'streak_3',  threshold: 3  },
          { id: 'streak_7',  threshold: 7  },
          { id: 'streak_30', threshold: 30 },
        ];
        for (const { id, threshold } of streakBadges) {
          if (newStreak >= threshold && !state.earnedBadgeIds.includes(id)) {
            newBadgeIds.push(id);
          }
        }

        set({
          dailyStreak: newStreak,
          dailyLastDate: today,
          dailyXp: newXp,
          dailyShields: newShields,
          dailyTodayScore: score,
          // Award badges via earnedBadgeIds directement (badges daily, path séparé)
          earnedBadgeIds: [...new Set([...state.earnedBadgeIds, ...newBadgeIds])],
          newBadgesThisSession: newBadgeIds.length > 0 ? newBadgeIds : state.newBadgesThisSession,
        });

        return { xpGained, newStreak, shieldUsed, shieldEarned, newBadgeIds };
      },

      setTimerEnabled: (enabled) => set({ timerEnabled: enabled }),

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      setAdminPin: (pin) => set({ adminPin: pin }),

      setAdminEmail: (email) => set({ adminEmail: email }),

      setDailyGoal: (goal) => set({ dailyGoal: goal }),

      addSession: (session) =>
        set((state) => ({
          sessions: [
            ...state.sessions,
            { ...session, playedAt: new Date().toISOString() },
          ],
        })),

      awardBadges: (ids) =>
        set((state) => ({
          // Ajoute uniquement les IDs non déjà présents (idempotent)
          earnedBadgeIds: [...new Set([...state.earnedBadgeIds, ...ids])],
          newBadgesThisSession: ids,
          // Rétro-compat : marque badgeEarned si premier badge reçu
          profile: state.profile && ids.length > 0
            ? { ...state.profile, badgeEarned: true }
            : state.profile,
        })),

      clearNewBadges: () => set({ newBadgesThisSession: [] }),

      // Rétro-compat — assure que 'first_game' est toujours dans earnedBadgeIds
      earnBadge: () =>
        set((state) => ({
          earnedBadgeIds: state.earnedBadgeIds.includes('first_game')
            ? state.earnedBadgeIds
            : [...state.earnedBadgeIds, 'first_game'],
          profile: state.profile ? { ...state.profile, badgeEarned: true } : null,
        })),

      resetProgress: () =>
        set((state) => ({
          sessions: [],
          earnedBadgeIds: [],
          newBadgesThisSession: [],
          dailyStreak: 0,
          dailyLastDate: null,
          dailyXp: 0,
          dailyShields: 0,
          dailyTodayScore: null,
          profile: state.profile
            ? { ...state.profile, badgeEarned: false }
            : null,
        })),

      deleteProfile: () =>
        set({
          profile: null,
          sessions: [],
          earnedBadgeIds: [],
          newBadgesThisSession: [],
          dailyStreak: 0,
          dailyLastDate: null,
          dailyXp: 0,
          dailyShields: 0,
          dailyTodayScore: null,
        }),
    }),
    {
      name: 'quizzly-profile',
      // newBadgesThisSession est volontairement exclu — sa valeur ne doit pas
      // survivre à un rechargement de page (état de session uniquement)
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { newBadgesThisSession, ...rest } = state;
        return rest;
      },
    }
  )
);
