'use client';

/**
 * src/components/features/admin/ReportSection.tsx
 *
 * Section "Rapport de progression" dans l'espace parent.
 * Permet au parent de :
 *   1. Télécharger un PDF de progression en un clic
 *   2. Envoyer ce PDF par email (via Edge Function Supabase + Resend)
 *   3. Configurer un envoi automatique (hebdomadaire / mensuel)
 *
 * Architecture PDF :
 *   - @react-pdf/renderer est incompatible SSR → dynamic import dans handleDownload()
 *   - Le PDF est généré entièrement côté client (blob URL)
 *   - Pour l'email, le PDF est converti en base64 et envoyé à l'Edge Function
 *
 * Architecture auto-send :
 *   - La préférence (none/weekly/monthly) est persistée dans profileStore + Supabase
 *   - L'envoi effectif est géré par un cron Supabase (pg_cron) qui appelle
 *     l'Edge Function send-report pour les profils concernés
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useNovaPresence } from '@/hooks/useNovaPresence';
import { FileText, Send, Calendar, Loader } from 'lucide-react';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { buildReportData, type ReportSchedule } from '@/lib/report';
import { syncAdminSettings } from '@/lib/sync';

// URL de l'Edge Function Supabase — doit être configurée dans les variables d'env
const SUPABASE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report`
  : null;

const SCHEDULE_OPTIONS: { value: ReportSchedule; labelKey: string }[] = [
  { value: 'none',    labelKey: 'reportScheduleNone' },
  { value: 'weekly',  labelKey: 'reportScheduleWeekly' },
  { value: 'monthly', labelKey: 'reportScheduleMonthly' },
];

export default function ReportSection() {
  const t = useTranslations('admin');
  const tNova = useTranslations('nova');
  const { showNova } = useNovaPresence();

  // Store Zustand — données sources du rapport
  const profile          = useProfileStore((s) => s.profile);
  const sessions         = useProfileStore((s) => s.sessions);
  const earnedBadgeIds   = useProfileStore((s) => s.earnedBadgeIds);
  const dailyStreak      = useProfileStore((s) => s.dailyStreak);
  const dailyXp          = useProfileStore((s) => s.dailyXp);
  const adminEmail       = useProfileStore((s) => s.adminEmail);
  const dailyGoal        = useProfileStore((s) => s.dailyGoal);
  const activeProfileId  = useProfileStore((s) => s.activeProfileId);
  const reportSchedule   = useProfileStore((s) => s.reportSchedule);
  const setReportSchedule = useProfileStore((s) => s.setReportSchedule);
  const session          = useAuthStore((s) => s.session);

  // État UI local
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [sendStatus,     setSendStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [scheduleSaved,  setScheduleSaved]  = useState(false);

  // Nova : correct + confirmation après envoi email réussi
  useEffect(() => {
    if (sendStatus === 'done') {
      showNova('correct', tNova('reportSent'), 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendStatus]);

  // ── Génération des données du rapport ────────────────────────────────────────

  function getReportData() {
    if (!profile) return null;
    return buildReportData({
      pseudo:        profile.pseudo,
      locale:        profile.locale,
      sessions,
      earnedBadgeIds,
      dailyStreak,
      dailyXp,
    });
  }

  // ── Téléchargement PDF ────────────────────────────────────────────────────────

  async function handleDownload() {
    const data = getReportData();
    if (!data) return;

    setDownloadStatus('loading');
    try {
      // Dynamic import — évite le chargement SSR de @react-pdf/renderer
      const [{ pdf }, { ReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ReportPdf'),
      ]);

      const blob = await pdf(<ReportPdf data={data} />).toBlob();
      const url  = URL.createObjectURL(blob);

      // Déclenchement du téléchargement navigateur
      const a = document.createElement('a');
      a.href     = url;
      a.download = `rapport-${profile?.pseudo ?? 'erudia'}-${data.generatedAt.split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadStatus('done');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.error('[ReportSection] Erreur génération PDF:', err);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 4000);
    }
  }

  // ── Envoi email ───────────────────────────────────────────────────────────────

  async function handleSendEmail() {
    if (!adminEmail || !SUPABASE_FUNCTION_URL) return;

    const data = getReportData();
    if (!data) return;

    setSendStatus('loading');
    try {
      // Génération PDF + conversion base64 pour l'Edge Function
      const [{ pdf }, { ReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ReportPdf'),
      ]);

      const blob   = await pdf(<ReportPdf data={data} />).toBlob();
      const buffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email:      adminEmail,
          pseudo:     data.pseudo,
          locale:     data.locale,
          pdfBase64:  base64,
          generatedAt: data.generatedAt,
        }),
      });

      if (!res.ok) throw new Error(`Edge Function error: ${res.status}`);

      setSendStatus('done');
      setTimeout(() => setSendStatus('idle'), 3000);
    } catch (err) {
      console.error('[ReportSection] Erreur envoi email:', err);
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 4000);
    }
  }

  // ── Sauvegarde planification ──────────────────────────────────────────────────

  async function handleScheduleChange(schedule: ReportSchedule) {
    setReportSchedule(schedule);
    // Sync vers Supabase — report_schedule persiste en base pour le cron serveur
    if (activeProfileId) {
      await syncAdminSettings(activeProfileId, dailyGoal, adminEmail, schedule);
    }
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2500);
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  const hasEmail   = Boolean(adminEmail);
  const canSend    = hasEmail && Boolean(SUPABASE_FUNCTION_URL);
  const isDownload = downloadStatus === 'loading';
  const isSending  = sendStatus === 'loading';

  return (
    <section className="admin__section admin__section--report" aria-labelledby="admin-report-title">

      {/* ── En-tête de section ──────────────────────────────────────────── */}
      <div className="admin__section-header">
        <FileText size={18} strokeWidth={2} aria-hidden="true" />
        <h2 id="admin-report-title" className="admin__section-title">
          {t('reportTitle')}
        </h2>
      </div>
      <p className="admin__section-desc">{t('reportDesc')}</p>

      {/* ── Actions principales ─────────────────────────────────────────── */}
      <div className="admin__report-actions">

        {/* Télécharger PDF */}
        <button
          type="button"
          className="admin__report-btn admin__report-btn--primary"
          onClick={handleDownload}
          disabled={isDownload || sessions.length === 0}
          aria-busy={isDownload}
        >
          {isDownload ? (
            <Loader size={16} strokeWidth={2} className="admin__report-spinner" aria-hidden="true" />
          ) : (
            <FileText size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {downloadStatus === 'done'  ? t('reportDownloaded') :
           downloadStatus === 'error' ? t('reportError') :
           t('reportDownload')}
        </button>

        {/* Envoyer par email */}
        <button
          type="button"
          className="admin__report-btn admin__report-btn--secondary"
          onClick={handleSendEmail}
          disabled={!canSend || isSending || sessions.length === 0}
          aria-busy={isSending}
          title={!hasEmail ? t('reportNoEmail') : undefined}
        >
          {isSending ? (
            <Loader size={16} strokeWidth={2} className="admin__report-spinner" aria-hidden="true" />
          ) : (
            <Send size={16} strokeWidth={2} aria-hidden="true" />
          )}
          {sendStatus === 'done'  ? t('reportSent') :
           sendStatus === 'error' ? t('reportError') :
           t('reportSend')}
        </button>

      </div>

      {/* Message si pas d'email configuré */}
      {!hasEmail && (
        <p className="admin__report-hint">{t('reportNoEmail')}</p>
      )}

      {/* ── Planification automatique ──────────────────────────────────── */}
      <div className="admin__report-schedule">
        <div className="admin__report-schedule-header">
          <Calendar size={15} strokeWidth={2} aria-hidden="true" />
          <span className="admin__report-schedule-label">{t('reportScheduleLabel')}</span>
          {scheduleSaved && (
            <span className="admin__report-schedule-saved">{t('reportScheduleSaved')}</span>
          )}
        </div>

        <div className="admin__schedule-options" role="group" aria-label={t('reportScheduleLabel')}>
          {SCHEDULE_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              className={`admin__schedule-btn${reportSchedule === value ? ' admin__schedule-btn--active' : ''}`}
              onClick={() => handleScheduleChange(value)}
              aria-pressed={reportSchedule === value}
            >
              {t(labelKey as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {reportSchedule !== 'none' && (
          <p className="admin__report-hint">
            {t('reportScheduleHint', { email: adminEmail ?? '—' })}
          </p>
        )}
      </div>

    </section>
  );
}
