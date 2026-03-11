'use client';

/**
 * src/app/[locale]/admin/page.tsx
 *
 * Route /admin — espace parent/enseignant.
 * Gardes :
 *   - Pas de profil enfant → redirect /
 *   - Non authentifié Supabase → redirect /auth/login
 *   - Authentifié → affiche AdminScreen
 *
 * Le PIN 4 chiffres (MVP 2) a été remplacé par Supabase Auth (MVP 3).
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import AdminScreen from '@/components/features/admin/AdminScreen';

export default function AdminPage() {
  const profile     = useProfileStore((s) => s.profile);
  const authUser    = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const router      = useRouter();
  // useSyncExternalStore — détecte l'hydratation sans setState dans un effet
  const hydrated    = useHydrated();

  useEffect(() => {
    if (!hydrated || authLoading) return;
    // Pas de profil enfant → onboarding
    if (!profile) {
      router.replace('/');
      return;
    }
    // Non authentifié → page de connexion
    if (!authUser) {
      router.replace('/auth/login');
    }
  }, [hydrated, authLoading, profile, authUser, router]);

  if (!hydrated || authLoading || !profile || !authUser) return null;

  return <AdminScreen />;
}
