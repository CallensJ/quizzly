// src/stores/profileStore.ts
//
// Store Zustand principal — gestion des profils enfants (multi-profils MVP 4)
// et des préférences parent.
//
// Architecture multi-profils :
//   - `profiles` : liste de tous les profils enfants du device
//   - `activeProfileId` : ID du profil actuellement en jeu
//   - `inactiveData` : données persistées des profils non-actifs (sessions, badges, daily)
//   - Les champs plats (profile, sessions, earnedBadgeIds, daily*) représentent
//     TOUJOURS le profil actif — les composants existants ne changent pas.
//
// Migration transparente : si des données v1 (profil sans `id`) sont détectées,
// elles sont migrées vers v2 via la fonction `migrate` de Zustand persist.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, QuizSession, Locale, AppTheme } from '@/types';
// import type only — évite d'embarquer les side-effects Supabase de sync.ts dans le store
import type { RemoteProfile } from '@/lib/sync';

/** Date du jour au format YYYY-MM-DD (fuseau local) — clé de comparaison du streak. */
function getDayString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fallback pour les navigateurs mobiles qui n'implémentent pas crypto.randomUUID()
// (certains Android WebView, iOS Safari < 15.4)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Résultat retourné par recordPlayStreak — utilisé par ResultsScreen pour l'affichage
export interface StreakResult {
  /** Valeur du streak après la partie */
  newStreak: number;
  /** true si cette partie est la première de la journée (le streak vient de bouger) */
  isFirstPlayToday: boolean;
  newBadgeIds: string[];
}

// Données persistées pour un profil non-actif
interface InactiveProfileData {
  sessions: QuizSession[];
  earnedBadgeIds: string[];
  dailyStreak: number;
  dailyLastDate: string | null;
}

interface ProfileState {
  // ── Multi-profils (MVP 4) ────────────────────────────────────────────────
  profiles: Profile[];                              // liste de tous les profils enfants
  activeProfileId: string | null;                   // profil actif
  inactiveData: Record<string, InactiveProfileData>; // données des profils non-actifs

  // ── Profil actif (identique à v1 — les composants n'ont pas à changer) ──
  profile: Profile | null;
  sessions: QuizSession[];

  // Identifiant unique du device — généré à la création du premier profil
  deviceId: string | null;

  // ── Préférences device (indépendantes du profil actif) ──────────────────
  timerEnabled: boolean;
  soundEnabled: boolean;

  // ── Mode Admin — accès parent/enseignant ─────────────────────────────────
  adminPin: string | null;
  adminEmail: string | null;
  /** Consentement RGPD Art. 6.1.a — email parent pour notifications */
  emailConsent: boolean;

  // ── Système de badges (profil actif) ────────────────────────────────────
  earnedBadgeIds: string[];
  newBadgesThisSession: string[]; // non persisté — reset au rechargement

  // ── Mode Défi Quotidien (profil actif) ──────────────────────────────────
  dailyStreak: number;
  dailyLastDate: string | null;

  // ── Sync bidirectionnelle ────────────────────────────────────────────────
  lastGoalNotifDate: string | null;

  // ── Actions multi-profils ────────────────────────────────────────────────
  /** Crée un nouveau profil enfant et l'active */
  addChildProfile: (data: Omit<Profile, 'createdAt' | 'id'>) => void;
  /** Bascule vers un autre profil enfant */
  switchProfile: (id: string) => void;
  /** Supprime un profil enfant (actif ou non) */
  removeChildProfile: (id: string) => void;

  // ── Actions existantes (opèrent sur le profil actif) ────────────────────
  setLastGoalNotifDate: (date: string) => void;
  mergeFromRemote: (remoteSessions: QuizSession[], remoteEarnedBadgeIds: string[], remoteProfiles?: RemoteProfile[]) => void;
  /** Enregistre une partie jouée pour la série quotidienne. Idempotent dans la journée. */
  recordPlayStreak: () => StreakResult;
  /** @deprecated Utiliser addChildProfile — conservé pour rétro-compat OnboardingScreen */
  createProfile: (data: Omit<Profile, 'createdAt' | 'id'>) => void;
  setLocale: (locale: Locale) => void;
  updateAvatar: (avatarId: string, avatarStyle?: string) => void;
  setTheme: (theme: AppTheme) => void;
  /** Langue du contenu des quiz — indépendante de la langue d'interface (cahier v1.4 §5). */
  setQuizLanguage: (quizLanguage: Locale) => void;
  setTimerEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAdminPin: (pin: string) => void;
  setAdminEmail: (email: string | null) => void;
  setEmailConsent: (consent: boolean) => void;
  addSession: (session: Omit<QuizSession, 'playedAt'>) => void;
  awardBadges: (ids: string[]) => void;
  clearNewBadges: () => void;
  earnBadge: () => void;
  resetProgress: () => void;
  deleteProfile: () => void;
}

// ── Helpers internes ─────────────────────────────────────────────────────────

/** Extrait les données per-profil de l'état plat courant */
function extractActiveData(state: ProfileState): InactiveProfileData {
  return {
    sessions: state.sessions,
    earnedBadgeIds: state.earnedBadgeIds,
    dailyStreak: state.dailyStreak,
    dailyLastDate: state.dailyLastDate,
  };
}

/** Données vides pour un nouveau profil */
const EMPTY_PROFILE_DATA: InactiveProfileData = {
  sessions: [],
  earnedBadgeIds: [],
  dailyStreak: 0,
  dailyLastDate: null,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      // ── État initial ───────────────────────────────────────────────────
      profiles: [],
      activeProfileId: null,
      inactiveData: {},
      profile: null,
      sessions: [],
      deviceId: null,
      timerEnabled: true,
      soundEnabled: true,
      adminPin: null,
      adminEmail: null,
      emailConsent: false,
      earnedBadgeIds: [],
      newBadgesThisSession: [],
      lastGoalNotifDate: null,
      dailyStreak: 0,
      dailyLastDate: null,

      // ── Multi-profils ──────────────────────────────────────────────────

      addChildProfile: (data) => {
        const state = get();
        const id = generateUUID();
        const newProfile: Profile = {
          ...data,
          id,
          createdAt: new Date().toISOString(),
        };

        // Sauvegarde les données du profil actif avant de basculer
        const inactiveData = { ...state.inactiveData };
        if (state.activeProfileId) {
          inactiveData[state.activeProfileId] = extractActiveData(state);
        }

        set({
          // deviceId ne change pas — il est propre au device, pas au profil
          deviceId: state.deviceId ?? generateUUID(),
          profiles: [...state.profiles, newProfile],
          activeProfileId: id,
          inactiveData,
          profile: newProfile,
          // Données vierges pour le nouveau profil
          ...EMPTY_PROFILE_DATA,
          newBadgesThisSession: [],
        });
      },

      switchProfile: (id) => {
        const state = get();
        if (id === state.activeProfileId) return;

        const targetProfile = state.profiles.find((p) => p.id === id);
        if (!targetProfile) return;

        // Sauvegarde profil actif
        const inactiveData = { ...state.inactiveData };
        if (state.activeProfileId) {
          inactiveData[state.activeProfileId] = extractActiveData(state);
        }

        // Charge les données du profil cible
        const targetData = inactiveData[id] ?? { ...EMPTY_PROFILE_DATA };
        delete inactiveData[id]; // il devient actif

        set({
          profile: targetProfile,
          activeProfileId: id,
          inactiveData,
          ...targetData,
          newBadgesThisSession: [],
        });
      },

      removeChildProfile: (id) => {
        const state = get();
        const remaining = state.profiles.filter((p) => p.id !== id);
        const inactiveData = { ...state.inactiveData };
        delete inactiveData[id];

        if (id === state.activeProfileId) {
          if (remaining.length > 0) {
            // Bascule sur le premier profil restant
            const next = remaining[0];
            const nextData = inactiveData[next.id] ?? { ...EMPTY_PROFILE_DATA };
            delete inactiveData[next.id];
            set({
              profiles: remaining,
              activeProfileId: next.id,
              inactiveData,
              profile: next,
              ...nextData,
              newBadgesThisSession: [],
            });
          } else {
            // Dernier profil supprimé → retour à l'état vierge
            set({
              profiles: [],
              activeProfileId: null,
              inactiveData: {},
              profile: null,
              ...EMPTY_PROFILE_DATA,
              newBadgesThisSession: [],
            });
          }
        } else {
          set({ profiles: remaining, inactiveData });
        }
      },

      // ── createProfile — rétro-compat OnboardingScreen ─────────────────
      // Délègue à addChildProfile (même logique)
      createProfile: (data) => {
        get().addChildProfile(data);
      },

      // ── Actions profil actif ──────────────────────────────────────────

      setLocale: (locale) =>
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, locale } : null;
          return {
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile : p))
              : state.profiles,
          };
        }),

      updateAvatar: (avatarId, avatarStyle) =>
        set((state) => {
          const updatedProfile = state.profile
            ? { ...state.profile, avatarId, ...(avatarStyle !== undefined ? { avatarStyle } : {}) }
            : null;
          return {
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile : p))
              : state.profiles,
          };
        }),

      setLastGoalNotifDate: (date) => set({ lastGoalNotifDate: date }),

      mergeFromRemote: (remoteSessions, remoteEarnedBadgeIds, remoteProfiles) =>
        set((state) => {
          const profiles = remoteProfiles ?? [];
          const existingDates = new Set(state.sessions.map((s) => s.playedAt));
          const newSessions = remoteSessions.filter((s) => !existingDates.has(s.playedAt));
          const mergedBadgeIds = [...new Set([...state.earnedBadgeIds, ...remoteEarnedBadgeIds])];

          // Cas 1 : nouvel appareil (aucun profil local) — restaure TOUS les profils cloud.
          // Le premier devient actif avec les sessions/badges mergés.
          // Les suivants sont créés vides dans inactiveData.
          if (!state.profile && profiles.length > 0) {
            const firstId = generateUUID();
            const first = profiles[0];
            const restoredFirst: Profile = {
              id:          firstId,
              pseudo:      first.pseudo,
              avatarId:    first.avatarId,
              avatarStyle: first.avatarStyle,
              locale:      first.locale as Locale,
              badgeEarned: mergedBadgeIds.length > 0,
              createdAt:   new Date().toISOString(),
            };

            const additionalProfiles: Profile[] = profiles.slice(1).map((rp) => ({
              id:          generateUUID(),
              pseudo:      rp.pseudo,
              avatarId:    rp.avatarId,
              avatarStyle: rp.avatarStyle,
              locale:      rp.locale as Locale,
              badgeEarned: false,
              createdAt:   new Date().toISOString(),
            }));

            const inactiveData: Record<string, InactiveProfileData> = {};
            for (const p of additionalProfiles) {
              inactiveData[p.id] = { ...EMPTY_PROFILE_DATA };
            }

            return {
              deviceId:        state.deviceId ?? generateUUID(),
              profiles:        [restoredFirst, ...additionalProfiles],
              activeProfileId: firstId,
              inactiveData,
              profile:         restoredFirst,
              sessions:        newSessions,
              earnedBadgeIds:  mergedBadgeIds,
              newBadgesThisSession: [],
            };
          }

          // Cas 2 : profils locaux existants.
          // - Merge sessions/badges dans le profil actif.
          // - Ajoute les profils distants absents localement (comparaison par pseudo).
          // - Met à jour l'avatar/locale du profil actif si son pseudo correspond.
          const localPseudos = new Set(state.profiles.map((p) => p.pseudo.toLowerCase()));
          const newRemoteProfiles: Profile[] = profiles
            .filter((rp) => !localPseudos.has(rp.pseudo.toLowerCase()))
            .map((rp) => ({
              id:          generateUUID(),
              pseudo:      rp.pseudo,
              avatarId:    rp.avatarId,
              avatarStyle: rp.avatarStyle,
              locale:      rp.locale as Locale,
              badgeEarned: false,
              createdAt:   new Date().toISOString(),
            }));

          const inactiveData = { ...state.inactiveData };
          for (const p of newRemoteProfiles) {
            inactiveData[p.id] = { ...EMPTY_PROFILE_DATA };
          }

          // Mise à jour identité du profil actif si le cloud a une version plus récente
          const remoteActive = profiles.find(
            (rp) => state.profile && rp.pseudo.toLowerCase() === state.profile!.pseudo.toLowerCase()
          );
          let updatedProfile = state.profile;
          if (remoteActive && state.profile) {
            updatedProfile = {
              ...state.profile,
              avatarId:    remoteActive.avatarId,
              avatarStyle: remoteActive.avatarStyle,
              locale:      remoteActive.locale as Locale,
              badgeEarned: mergedBadgeIds.length > 0,
            };
          } else if (state.profile && mergedBadgeIds.length > 0) {
            updatedProfile = { ...state.profile, badgeEarned: true };
          }

          const allProfiles = [
            ...state.profiles.map((p) =>
              p.id === state.activeProfileId && updatedProfile ? updatedProfile : p
            ),
            ...newRemoteProfiles,
          ];

          return {
            sessions:      [...state.sessions, ...newSessions],
            earnedBadgeIds: mergedBadgeIds,
            profile:       updatedProfile,
            profiles:      allProfiles,
            inactiveData,
          };
        }),

      recordPlayStreak: () => {
        const state = get();
        const today = getDayString();
        const last  = state.dailyLastDate;

        // Déjà joué aujourd'hui : le streak ne bouge pas.
        if (last === today) {
          return { newStreak: state.dailyStreak, isFirstPlayToday: false, newBadgeIds: [] };
        }

        // Jour consécutif → +1 ; sinon la série repart à 1.
        const msPerDay = 86_400_000;
        const daysSinceLast = last
          ? Math.round((new Date(today).getTime() - new Date(last).getTime()) / msPerDay)
          : Infinity;
        const newStreak = daysSinceLast === 1 ? state.dailyStreak + 1 : 1;

        const newBadgeIds: string[] = [];
        const streakBadges = [
          { id: 'streak_3',  threshold: 3  },
          { id: 'streak_7',  threshold: 7  },
          { id: 'streak_14', threshold: 14 },
          { id: 'streak_30', threshold: 30 },
          { id: 'streak_60', threshold: 60 },
        ];
        for (const { id, threshold } of streakBadges) {
          if (newStreak >= threshold && !state.earnedBadgeIds.includes(id)) {
            newBadgeIds.push(id);
          }
        }

        set({
          dailyStreak: newStreak,
          dailyLastDate: today,
          earnedBadgeIds: [...new Set([...state.earnedBadgeIds, ...newBadgeIds])],
          newBadgesThisSession: newBadgeIds.length > 0 ? newBadgeIds : state.newBadgesThisSession,
        });

        return { newStreak, isFirstPlayToday: true, newBadgeIds };
      },

      setTheme: (theme) =>
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, theme } : null;
          return {
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile : p))
              : state.profiles,
          };
        }),

      setQuizLanguage: (quizLanguage) =>
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, quizLanguage } : null;
          return {
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile : p))
              : state.profiles,
          };
        }),

      setTimerEnabled: (enabled) => set({ timerEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setAdminPin: (pin) => set({ adminPin: pin }),
      setAdminEmail: (email) => set({ adminEmail: email }),
      setEmailConsent: (consent) => set({ emailConsent: consent }),

      addSession: (session) =>
        set((state) => ({
          sessions: [
            ...state.sessions,
            { ...session, playedAt: new Date().toISOString() },
          ],
          // Reset pour que la prochaine session Results parte d'une ardoise vierge
          newBadgesThisSession: [],
        })),

      awardBadges: (ids) =>
        set((state) => {
          const updatedProfile = state.profile && ids.length > 0
            ? { ...state.profile, badgeEarned: true }
            : state.profile;
          return {
            earnedBadgeIds: [...new Set([...state.earnedBadgeIds, ...ids])],
            newBadgesThisSession: ids,
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile! : p))
              : state.profiles,
          };
        }),

      clearNewBadges: () => set({ newBadgesThisSession: [] }),

      earnBadge: () =>
        set((state) => {
          const updatedProfile = state.profile ? { ...state.profile, badgeEarned: true } : null;
          return {
            earnedBadgeIds: state.earnedBadgeIds.includes('first_game')
              ? state.earnedBadgeIds
              : [...state.earnedBadgeIds, 'first_game'],
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile! : p))
              : state.profiles,
          };
        }),

      resetProgress: () =>
        set((state) => {
          const updatedProfile = state.profile
            ? { ...state.profile, badgeEarned: false }
            : null;
          return {
            sessions: [],
            earnedBadgeIds: [],
            newBadgesThisSession: [],
            dailyStreak: 0,
            dailyLastDate: null,
            profile: updatedProfile,
            profiles: updatedProfile
              ? state.profiles.map((p) => (p.id === state.activeProfileId ? updatedProfile! : p))
              : state.profiles,
          };
        }),

      deleteProfile: () => {
        // Supprime le profil actif via removeChildProfile
        const { activeProfileId, removeChildProfile } = get();
        if (activeProfileId) {
          removeChildProfile(activeProfileId);
        }
      },
    }),
    {
      name: 'erudia-profile',
      version: 2,
      // Migration v1 → v2 : profil sans `id` ni `profiles[]`
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const old = persistedState as Record<string, unknown>;
          const oldProfile = old.profile as (Profile & { id?: string }) | null;
          if (oldProfile && !oldProfile.id) {
            const profileWithId: Profile = { ...oldProfile, id: generateUUID() };
            return {
              ...old,
              profile: profileWithId,
              profiles: [profileWithId],
              activeProfileId: profileWithId.id,
              inactiveData: {},
            };
          }
          // Profil avec id mais sans profiles[] (migration partielle)
          if (oldProfile && oldProfile.id && !Array.isArray(old.profiles)) {
            return {
              ...old,
              profiles: [oldProfile],
              activeProfileId: oldProfile.id,
              inactiveData: {},
            };
          }
        }
        return persistedState;
      },
      // newBadgesThisSession est exclu — état de session non persisté
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { newBadgesThisSession, ...rest } = state;
        return rest;
      },
    }
  )
);
