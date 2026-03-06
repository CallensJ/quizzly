'use client';

/**
 * src/app/[locale]/results/page.tsx
 *
 * Route /results — écran de fin de partie.
 * Garde : redirige vers / si aucun profil (accès direct sans onboarding).
 * La garde "quiz non terminé" (status !== 'finished') est gérée dans ResultsScreen.
 */

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import ResultsScreen from '@/components/features/results/ResultsScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function ResultsPage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return (
    <AppLayout>
      <ResultsScreen />
    </AppLayout>
  );
}
