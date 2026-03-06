// src/stores/profileStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, QuizSession, Locale } from '@/types';

interface ProfileState {
  profile: Profile | null;
  sessions: QuizSession[];
  createProfile: (data: Omit<Profile, 'createdAt'>) => void;
  setLocale: (locale: Locale) => void;
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

      createProfile: (data) =>
        set({
          profile: {
            ...data,
            createdAt: new Date().toISOString(),
          },
        }),

      setLocale: (locale) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, locale } : null,
        })),

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
