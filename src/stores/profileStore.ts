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
  createProfile: (data: Omit<Profile, 'createdAt'>) => void;
  setLocale: (locale: Locale) => void;
  updateAvatar: (avatarId: string) => void;
  setTimerEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAdminPin: (pin: string) => void;
  setAdminEmail: (email: string | null) => void;
  setDailyGoal: (goal: number | null) => void;
  addSession: (session: Omit<QuizSession, 'playedAt'>) => void;
  earnBadge: () => void;
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

      updateAvatar: (avatarId) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, avatarId } : null,
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

      earnBadge: () =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, badgeEarned: true }
            : null,
        })),

      resetProgress: () =>
        set((state) => ({
          sessions: [],
          profile: state.profile
            ? { ...state.profile, badgeEarned: false }
            : null,
        })),

      deleteProfile: () =>
        set({ profile: null, sessions: [] }),
    }),
    {
      name: 'quizzly-profile',
    }
  )
);
