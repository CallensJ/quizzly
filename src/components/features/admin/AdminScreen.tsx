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
import { ArrowLeft, BarChart3, LogOut, TrendingUp, Info } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { signOut } from "@/lib/auth";
import { useNovaPresence } from "@/hooks/useNovaPresence";
import ReportSection from "./ReportSection";
import GoalsSection from "./GoalsSection";
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
  const dailyGoal = useProfileStore((s) => s.dailyGoal);
  const authUser = useAuthStore((s) => s.user);

  const setMultiplayerUnlocked = useProfileStore(
    (s) => s.setMultiplayerUnlocked,
  );
  const setDailyGoal = useProfileStore((s) => s.setDailyGoal);
  const resetProgress = useProfileStore((s) => s.resetProgress);

  useEffect(() => {
    showNova("welcome", tNova("adminWelcome"), 3000);
    return () => hideNova();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [goalFeedback, setGoalFeedback] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(dailyGoal ?? 0);
  const [aboutOpen, setAboutOpen] = useState(false);

  function handleSaveGoal() {
    setDailyGoal(selectedGoal === 0 ? null : selectedGoal);
    setGoalFeedback(true);
    setTimeout(() => setGoalFeedback(false), 2500);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/profile");
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

      <main className="admin__body">
        {/* ── Stats enfant ─────────────────────────────────────────────────── */}
        <section
          className="admin__section admin__section--stats"
          aria-labelledby="admin-stats-title"
        >
          <div className="admin__section-header">
            <BarChart3 size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-stats-title" className="admin__section-title">
              {t("statsTitle", { pseudo: profile?.pseudo ?? "" })}
            </h2>
          </div>

          <button
            type="button"
            className="admin__dashboard-btn"
            onClick={() => router.push("/dashboard")}
          >
            <TrendingUp size={16} strokeWidth={2} />
            Voir la progression dans le temps
          </button>

          {totalGames === 0 ? (
            <p className="admin__empty">{t("statsNoSession")}</p>
          ) : (
            <div className="admin__stats-grid">
              <div className="admin__stat-card">
                <span className="admin__stat-value">{totalGames}</span>
                <span className="admin__stat-label">
                  {t("statsTotalGames")}
                </span>
              </div>
              <div className="admin__stat-card">
                <span className="admin__stat-value">{totalPoints}</span>
                <span className="admin__stat-label">
                  {t("statsTotalPoints")}
                </span>
              </div>
              <div className="admin__stat-card">
                <span className="admin__stat-value">
                  {bestPct !== null ? `${bestPct}%` : "—"}
                </span>
                <span className="admin__stat-label">{t("statsBestScore")}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Gestion des profils enfants ──────────────────────────────────── */}
        <AdminErrorBoundary label="ChildProfiles">
          <ChildProfilesSection />
        </AdminErrorBoundary>

        {/* ── Objectifs par catégorie ─────────────────────────────────────── */}
        <AdminErrorBoundary label="Goals">
          <GoalsSection />
        </AdminErrorBoundary>

        {/* ── Rapport de progression PDF ───────────────────────────────────── */}
        {/*<AdminErrorBoundary label="Report"><ReportSection /></AdminErrorBoundary>*/}

        {/* ── Abonnement Premium ─────────────────────────────────────────── */}
        <AdminErrorBoundary label="Subscription">
          <SubscriptionSection />
        </AdminErrorBoundary>

        {/* ── Zone de danger ───────────────────────────────────────────────── */}
        <AdminErrorBoundary label="DangerZone">
          <DangerZone onReset={() => resetProgress()} />
        </AdminErrorBoundary>

        {/* ── Lien À propos ────────────────────────────────────────────────── */}
        <button
          type="button"
          className="admin__about-link"
          onClick={() => setAboutOpen(true)}
        >
          <Info size={13} strokeWidth={2} aria-hidden="true" />
          {t("aboutLink")}
        </button>
      </main>

      {/* ── Modale À propos ─────────────────────────────────────────────── */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
