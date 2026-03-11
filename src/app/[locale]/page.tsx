'use client';

/**
 * src/app/[locale]/page.tsx
 *
 * Point d'entrée de l'application (route /).
 * - Pas de profil  → affiche <OnboardingScreen />
 * - Profil présent → redirige vers /home
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
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  // useSyncExternalStore — détecte l'hydratation sans setState dans un effet
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && profile) {
      router.replace('/home');
    }
  }, [hydrated, profile, router]);

  if (!hydrated) return null;
  if (profile) return null; // redirection en cours

  return <OnboardingScreen />;
}
