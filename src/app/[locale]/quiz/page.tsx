'use client';

/**
 * src/app/[locale]/quiz/page.tsx
 *
 * Route /quiz — écran de jeu.
 * Garde : redirige vers / si aucun profil (accès direct sans onboarding).
 * La garde "quiz non démarré" (status idle) est gérée dans QuizScreen.
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import QuizScreen from '@/components/features/quiz/QuizScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function QuizPage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  // useSyncExternalStore — détecte l'hydratation sans setState dans un effet
  const hydrated = useHydrated();

  useEffect(() => {
  }, []);

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return (
    <AppLayout>
      <QuizScreen />
    </AppLayout>
  );
}
