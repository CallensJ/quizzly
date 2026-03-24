'use client';

/**
 * src/app/[locale]/page.tsx
 *
 * Point d'entrée de l'application (route /).
 *
 * Logique de routage multi-profils (MVP 4) :
 *   - Aucun profil               → <OnboardingScreen /> (premier lancement)
 *   - 1 profil ou activeProfileId → redirige vers /home
 *   - Plusieurs profils, pas d'activeProfileId → redirige vers /profiles (sélection)
 *
 * Note : 'use client' obligatoire — Zustand persist lit localStorage,
 * indisponible côté serveur. Pattern useEffect pour attendre l'hydratation.
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import OnboardingScreen from '@/components/features/onboarding/OnboardingScreen';

export default function RootPage() {
  const profiles        = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const router          = useRouter();
  const hydrated        = useHydrated();

  useEffect(() => {
    if (!hydrated) return;

    if (profiles.length === 0) return; // affiche OnboardingScreen

    if (activeProfileId) {
      // Profil actif connu → accueil direct
      router.replace('/home');
    } else {
      // Plusieurs profils mais aucun actif → sélection
      router.replace('/profiles');
    }
  }, [hydrated, profiles.length, activeProfileId, router]);

  if (!hydrated) return null;
  if (profiles.length > 0) return null; // redirection en cours

  return <OnboardingScreen />;
}
