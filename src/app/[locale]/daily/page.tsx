'use client';

/**
 * src/app/[locale]/daily/page.tsx
 *
 * Route /daily — Mode Défi Quotidien (MVP 4).
 * Guard : redirige vers / si aucun profil (accès direct sans onboarding).
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import DailyScreen from '@/components/features/daily/DailyScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function DailyPage() {
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
      <DailyScreen />
    </AppLayout>
  );
}
