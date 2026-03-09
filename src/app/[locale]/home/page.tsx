'use client';

/**
 * src/app/[locale]/home/page.tsx
 *
 * Route /home — écran principal post-onboarding.
 * Redirige vers / si aucun profil n'est trouvé (accès direct à l'URL sans onboarding).
 */

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import HomeScreen from '@/components/features/home/HomeScreen';
import AppLayout from '@/components/layout/AppLayout';

export default function HomePage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Pattern SSR Zustand : détecte la fin de l'hydratation côté client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Garde : si l'utilisateur accède directement à /home sans profil, on le renvoie à l'onboarding
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return (
    <AppLayout>
      <HomeScreen />
    </AppLayout>
  );
}
