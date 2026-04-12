"use client";

/**
 * src/app/[locale]/admin/page.tsx
 *
 * Route /admin — espace parent.
 * Gardes :
 *   - authLoading → attendre (évite un flash d'accès non authentifié)
 *   - Pas de profil enfant → redirect /
 *   - Non connecté → redirect /auth/login
 *   - Connecté + profil → AdminScreen
 */

import { useEffect } from "react";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "@/i18n/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import AdminScreen from "@/components/features/admin/AdminScreen";

export default function AdminPage() {
  const profile     = useProfileStore((s) => s.profile);
  const authUser    = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const router      = useRouter();
  const hydrated    = useHydrated();

  useEffect(() => {
    if (!hydrated || authLoading) return;
    if (!profile) { router.replace("/"); return; }
    if (!authUser) { router.replace("/auth/login"); return; }
  }, [hydrated, authLoading, profile, authUser, router]);

  if (!hydrated || authLoading || !profile || !authUser) return null;

  return <AdminScreen />;
}
