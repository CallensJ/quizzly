'use client';

/**
 * src/app/[locale]/profiles/page.tsx
 *
 * Route /profiles — sélection ou gestion des profils enfants.
 * Accessible depuis :
 *   - page.tsx (root) quand plusieurs profils et pas d'activeProfileId
 *   - Le bouton "Changer d'enfant" dans la sidebar (AppLayout)
 *   - Le bouton "Gérer les profils" dans AdminScreen
 *
 * Redirige vers / si aucun profil existe (premier lancement).
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import ProfileSelector from '@/components/features/profiles/ProfileSelector';

export default function ProfilesPage() {
  const profiles  = useProfileStore((s) => s.profiles);
  const hydrated  = useHydrated();
  const router    = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    // Pas de profils du tout → onboarding (premier lancement)
    if (profiles.length === 0) {
      router.replace('/');
    }
  }, [hydrated, profiles.length, router]);

  if (!hydrated) return null;
  if (profiles.length === 0) return null; // redirection en cours

  return <ProfileSelector />;
}
