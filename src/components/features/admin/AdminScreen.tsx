"use client";

/**
 * src/components/features/admin/AdminScreen.tsx
 *
 * Espace parent — accès protégé par Supabase Auth (MVP 3+).
 *
 * Flux d'accès :
 *   - Non connecté → redirect vers /auth/login (géré dans admin/page.tsx)
 *   - Connecté → tableau de bord parent affiché directement
 *
 * Sections (composants extraits) :
 *   - SubscriptionSection  — statut abonnement Stripe
 *   - Stats enfant         — lecture seule (inline, simple)
 *   - Objectif journalier  — inline
 *   - GoalsSection         — objectifs par catégorie
 *   - AdminEmailSection    — email de contact (Zod + sync Supabase)
 *   - ReportSection        — rapport PDF
 *   - Mode Défi            — toggle multijoueur
 *   - ChildProfilesSection — gestion des profils enfants
 *   - DangerZone           — reset / suppression
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Target,
  BarChart3,
  LogOut,
  Swords,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useProfileStore } from "@/stores/profileStore";
import { useAuthStore } from "@/stores/authStore";
import { signOut } from "@/lib/auth";
import { useNovaPresence } from "@/hooks/useNovaPresence";
import ReportSection from "./ReportSection";
import GoalsSection from "./GoalsSection";
import SubscriptionSection from "./SubscriptionSection";
import ChildProfilesSection from "./ChildProfilesSection";
import AdminEmailSection from "./AdminEmailSection";
import DangerZone from "./DangerZone";

// Valeurs possibles pour l'objectif journalier (0 = désactivé)
const GOAL_OPTIONS = [0, 5, 10, 15, 20, 30];

export default function AdminScreen() {
  const t = useTranslations("admin");
  const tNova = useTranslations("nova");
  const router = useRouter();
  const { showNova, hideNova } = useNovaPresence();

  const profile = useProfileStore((s) => s.profile);
  const sessions = useProfileStore((s) => s.sessions);
  const dailyGoal = useProfileStore((s) => s.dailyGoal);

  const authUser = useAuthStore((s) => s.user);

  const multiplayerUnlocked = useProfileStore((s) => s.multiplayerUnlocked);
  const setMultiplayerUnlocked = useProfileStore(
    (s) => s.setMultiplayerUnlocked,
  );
  const setDailyGoal = useProfileStore((s) => s.setDailyGoal);
  const resetProgress = useProfileStore((s) => s.resetProgress);
  const deleteProfile = useProfileStore((s) => s.deleteProfile);

  // Nova : welcome à l'entrée de l'espace parent (3s)
  useEffect(() => {
    showNova('welcome', tNova('adminWelcome'), 3000);
    return () => hideNova();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── État UI ─────────────────────────────────────────────────────────────────
  const [goalFeedback, setGoalFeedback] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<number>(dailyGoal ?? 0);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveGoal() {
    setDailyGoal(selectedGoal === 0 ? null : selectedGoal);
    setGoalFeedback(true);
    setTimeout(() => setGoalFeedback(false), 2500);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/profile");
  }

  // ── Stats calculées ─────────────────────────────────────────────────────────
  const totalGames = sessions.length;
  const totalPoints = sessions.reduce((sum, s) => sum + s.score, 0);
  const bestPct = sessions.length
    ? Math.round(
        Math.max(...sessions.map((s) => s.score / s.totalQuestions)) * 100,
      )
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────
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
        {/* ── Abonnement Premium ──────────────────────────────────────────── */}
        <SubscriptionSection />

        {/* ── Stats enfant (lecture seule) ────────────────────────────────── */}
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

        {/* ── Objectif journalier ─────────────────────────────────────────── */}
        <section
          className="admin__section admin__section--goal"
          aria-labelledby="admin-goal-title"
        >
          <div className="admin__section-header">
            <Target size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-goal-title" className="admin__section-title">
              {t("goalTitle")}
            </h2>
          </div>
          <p className="admin__section-desc">{t("goalDesc")}</p>

          <div
            className="admin__goal-options"
            role="group"
            aria-label={t("goalTitle")}
          >
            {GOAL_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                className={`admin__goal-btn${selectedGoal === val ? " admin__goal-btn--active" : ""}`}
                onClick={() => setSelectedGoal(val)}
                aria-pressed={selectedGoal === val}
              >
                {val === 0 ? t("goalDisabled") : val}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="admin__save-btn"
            onClick={handleSaveGoal}
          >
            {goalFeedback ? t("goalSaved") : t("goalSave")}
          </button>
        </section>

        {/* ── Objectifs par catégorie ─────────────────────────────────────── */}
        <GoalsSection />

        {/* ── Email de contact ────────────────────────────────────────────── */}
        <AdminEmailSection />

        {/* ── Rapport de progression PDF ───────────────────────────────────── */}
        <ReportSection />

        {/* ── Mode Défi (multijoueur) ──────────────────────────────────────── */}
        <section
          className="admin__section admin__section--multiplayer"
          aria-labelledby="admin-multiplayer-title"
        >
          <div className="admin__section-header">
            <Swords size={18} strokeWidth={2} aria-hidden="true" />
            <h2 id="admin-multiplayer-title" className="admin__section-title">
              {t("multiplayerTitle")}
            </h2>
          </div>
          <p className="admin__section-desc">{t("multiplayerDesc")}</p>

          <div className="admin__toggle-row">
            <span className="admin__toggle-label">
              {multiplayerUnlocked
                ? t("multiplayerEnabled")
                : t("multiplayerDisabled")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={multiplayerUnlocked}
              className={`admin__toggle${multiplayerUnlocked ? " admin__toggle--on" : ""}`}
              onClick={() => setMultiplayerUnlocked(!multiplayerUnlocked)}
            >
              <span className="admin__toggle-thumb" />
            </button>
          </div>
        </section>

        {/* ── Gestion des profils enfants ──────────────────────────────────── */}
        <ChildProfilesSection />

        {/* ── Zone de danger ───────────────────────────────────────────────── */}
        <DangerZone
          onReset={() => resetProgress()}
          onDelete={() => {
            deleteProfile();
            router.replace("/");
          }}
        />
      </main>
    </div>
  );
}
