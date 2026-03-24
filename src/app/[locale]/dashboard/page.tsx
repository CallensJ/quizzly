'use client';

/**
 * src/app/[locale]/dashboard/page.tsx
 *
 * Route /dashboard — Dashboard avancé parent (MVP 4 Premium).
 * Accessible depuis AdminScreen uniquement (auth Supabase requise).
 *
 * Gardes :
 *   - Profil enfant absent → /
 *   - Non connecté Supabase → /auth/login
 */

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/useHydrated';
import DashboardScreen from '@/components/features/admin/DashboardScreen';

export default function DashboardPage() {
  const profiles  = useProfileStore((s) => s.profiles);
  const authUser  = useAuthStore((s) => s.user);
  const loading   = useAuthStore((s) => s.loading);
  const hydrated  = useHydrated();
  const router    = useRouter();

  useEffect(() => {
    if (!hydrated || loading) return;
    if (profiles.length === 0) { router.replace('/'); return; }
    if (!authUser)             { router.replace('/auth/login'); }
  }, [hydrated, loading, profiles.length, authUser, router]);

  if (!hydrated || loading)       return null;
  if (profiles.length === 0)      return null;
  if (!authUser)                  return null;

  return <DashboardScreen />;
}
