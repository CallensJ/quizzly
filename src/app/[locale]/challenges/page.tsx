'use client';

/**
 * src/app/[locale]/challenges/page.tsx
 *
 * Route /challenges — Mode multijoueur (MVP 4).
 * Guard : redirige vers / si aucun profil (accès direct sans onboarding).
 * La vérification multiplayerUnlocked est gérée dans ChallengesScreen.
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import ChallengesScreen from '@/components/features/multiplayer/ChallengesScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function ChallengesPage() {
  const profile  = useProfileStore((s) => s.profile);
  const router   = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return (
    <AppLayout>
      <ChallengesScreen />
    </AppLayout>
  );
}
