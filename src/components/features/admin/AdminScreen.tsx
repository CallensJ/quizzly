"use client";

/**
 * src/components/features/admin/AdminScreen.tsx
 *
 * Espace parent — auth obligatoire (Supabase Auth).
 *
 * Flux d'accès :
 *   - Connecté → tableau de bord complet + abonnement premium
 *   - Redit vers /auth/login si non connecté (gardé en page.tsx)
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, LogOut, TrendingUp, Info, Gamepad2, Star, Trophy, User } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { signOut } from "@/lib/auth";
import { useNovaPresence } from "@/hooks/useNovaPresence";
import SubscriptionSection from "./SubscriptionSection";
import ChildProfilesSection from "./ChildProfilesSection";
import DangerZone from "./DangerZone";
import AboutModal from "./AboutModal";
import { AdminErrorBoundary } from "./AdminErrorBoundary";

export default function AdminScreen() {
  const t = useTranslations("admin");
  const tNova = useTranslations("nova");
  const router = useRouter();
  const { showNova, hideNova } = useNovaPresence();

  const profile = useProfileStore((s) => s.profile);
  const sessions = useProfileStore((s) => s.sessions);
  const authUser = useAuthStore((s) => s.user);

  const resetProgress = useProfileStore((s) => s.resetProgress);

  useEffect(() => {
    showNova("welcome", tNova("adminWelcome"), 3000);
    return () => hideNova();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [aboutOpen, setAboutOpen] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    );
  }, []);


  async function handleSignOut() {
    // Navigate first so the admin guard doesn't race with the auth state change
    router.replace("/profile");
    await signOut();
  }

  const totalGames = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const bestPct = sessions.length
    ? Math.round(
        Math.max(...sessions.map((s) => s.score / s.totalQuestions)) * 100,
      )
    : null;

  return (
    <div className="admin">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="admin__header">
        <button
          type="button"
          className="admin__back-btn"
          onClick={() => router.push("/profile")}
          aria-label={t("ctaBack")}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="admin__title">{t("title")}</h1>

        <button
          type="button"
          className="admin__signout-btn"
          onClick={handleSignOut}
          aria-label={t("authSignOut")}
          title={authUser?.email ?? ""}
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </header>

      {/* ── Barre de bienvenue ───────────────────────────────────────────────── */}
      <div className="admin__welcome-bar">
        <span className="admin__welcome-user">
          <User size={13} aria-hidden="true" />
          {authUser?.email}
        </span>
        {today && <time className="admin__welcome-date">{today}</time>}
      </div>

      <main className="admin__body">
        {/* ── KPI hero strip — métriques clés pleine largeur ───────────────── */}
        <div className="admin__kpi-strip">
          {totalGames === 0 ? (
            <p className="admin__kpi-empty">{t("statsNoSession")}</p>
          ) : (
            <div className="admin__kpi-cards">
              <div className="admin__kpi-card">
                <Gamepad2 size={22} className="admin__kpi-icon" aria-hidden="true" />
                <span className="admin__kpi-value">{totalGames}</span>
                <span className="admin__kpi-label">{t("statsTotalGames")}</span>
              </div>
              <div className="admin__kpi-card">
                <Star size={22} className="admin__kpi-icon" aria-hidden="true" />
                <span className="admin__kpi-value">{totalPoints}</span>
                <span className="admin__kpi-label">{t("statsTotalPoints")}</span>
              </div>
              <div className="admin__kpi-card">
                <Trophy size={22} className="admin__kpi-icon" aria-hidden="true" />
                <span className="admin__kpi-value">
                  {bestPct !== null ? `${bestPct}%` : "—"}
                </span>
                <span className="admin__kpi-label">{t("statsBestScore")}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="admin__dashboard-btn"
            onClick={() => router.push("/dashboard")}
          >
            <TrendingUp size={16} strokeWidth={2} />
            Voir la progression dans le temps
          </button>
        </div>

        {/* ── Col gauche : Profils + Abonnement (empilés sans gap de row) ─────── */}
        <div className="admin__col-left">
          <AdminErrorBoundary label="ChildProfiles">
            <ChildProfilesSection />
          </AdminErrorBoundary>
          <AdminErrorBoundary label="Subscription">
            <SubscriptionSection />
          </AdminErrorBoundary>
        </div>


        {/* ── Zone de danger — pleine largeur ───────────────────────────────── */}
        <AdminErrorBoundary label="DangerZone">
          <DangerZone onReset={() => resetProgress()} />
        </AdminErrorBoundary>

        {/* ── Lien À propos ─────────────────────────────────────────────────── */}
        <button
          type="button"
          className="admin__about-link"
          onClick={() => setAboutOpen(true)}
        >
          <Info size={13} strokeWidth={2} aria-hidden="true" />
          {t("aboutLink")}
        </button>
      </main>

      {/* ── Modale À propos ─────────────────────────────────────────────────── */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
