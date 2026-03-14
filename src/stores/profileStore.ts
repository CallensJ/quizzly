// src/stores/profileStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, QuizSession, Locale } from '@/types';

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

  // ── Système de badges étendu (MVP 4) ─────────────────────────────────────
  // Source de vérité : liste des IDs de badges obtenus (persistée)
  earnedBadgeIds: string[];
  // Badges gagnés lors de la dernière session uniquement (non persisté — reset au rechargement)
  newBadgesThisSession: string[];

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
      soundEnabled: true, // activé par défaut — les enfants apprécient le feedback sonore
      adminPin: null,
      adminEmail: null,
      dailyGoal: null,
      earnedBadgeIds: [],
      // newBadgesThisSession n'est pas persisté (exclu via partialize ci-dessous)
      newBadgesThisSession: [],

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
          profile: state.profile
            ? { ...state.profile, badgeEarned: false }
            : null,
        })),

      deleteProfile: () =>
        set({ profile: null, sessions: [], earnedBadgeIds: [], newBadgesThisSession: [] }),
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
