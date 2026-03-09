'use client';

/**
 * src/app/[locale]/profile/page.tsx
 *
 * Route /profile — écran de profil / dashboard.
 * Garde : redirige vers / si aucun profil (accès direct sans onboarding).
 * Accessible depuis l'icône profil (mobile) et la sidebar (desktop).
 */

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import ProfileScreen from '@/components/features/profile/ProfileScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function ProfilePage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Pattern SSR Zustand : détecte la fin de l'hydratation côté client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <ProfileScreen />
    </AppLayout>
  );
}
