'use client';

/**
 * src/app/[locale]/admin/page.tsx
 *
 * Route /admin — espace parent/enseignant.
 * Garde : redirige vers / si aucun profil, vers /profile si pas de PIN défini.
 * L'accès est protégé par un PIN 4 chiffres géré dans profileStore.
 * La vérification du PIN est faite dans AdminScreen avant d'afficher le contenu.
 */

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { useRouter } from '@/i18n/navigation';
import AdminScreen from '@/components/features/admin/AdminScreen';

export default function AdminPage() {
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

  // AdminScreen gère lui-même le modal PIN (création ou vérification)
  // Pas de AppLayout — l'admin a son propre layout plein écran
  return <AdminScreen />;
}
