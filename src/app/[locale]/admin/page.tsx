"use client";

/**
 * src/app/[locale]/admin/page.tsx
 *
 * Route /admin — espace parent.
 * Gardes :
 *   - Pas de profil enfant → redirect /
 *   - Authentifié ou non → AdminScreen accessible (auth optionnelle)
 *     L'auth Supabase débloque les stats cross-device et l'abonnement premium.
 *     Sans auth : stats locales uniquement, bouton "Créer un compte" visible.
 */

import { useEffect } from "react";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "@/i18n/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import AdminScreen from "@/components/features/admin/AdminScreen";

export default function AdminPage() {
  const profile = useProfileStore((s) => s.profile);
  const authLoading = useAuthStore((s) => s.loading);
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    // Pas de profil enfant → onboarding
    if (!profile) {
      router.replace("/");
    }
    // Pas de redirect auth — l'espace parent est accessible sans compte
  }, [hydrated, profile, router]);

  // Bloquer le rendu uniquement le temps de l'hydratation et du check auth initial
  if (!hydrated || authLoading || !profile) return null;

  return <AdminScreen />;
}
