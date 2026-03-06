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

export default function HomePage() {
  const profile = useProfileStore((s) => s.profile);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Garde : si l'utilisateur accède directement à /home sans profil, on le renvoie à l'onboarding
    if (hydrated && !profile) {
      router.replace('/');
    }
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return null;

  return <HomeScreen />;
}
