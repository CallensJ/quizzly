'use client';

/**
 * src/app/[locale]/stats/page.tsx
 *
 * Route /stats — écran statistiques détaillées du joueur.
 * Garde : redirige vers / si aucun profil (accès direct sans onboarding).
 * Accessible depuis le bouton "Mes statistiques" dans ProfileScreen.
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import StatsScreen from '@/components/features/stats/StatsScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function StatsPage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return (
    <AppLayout>
      <StatsScreen />
    </AppLayout>
  );
}
