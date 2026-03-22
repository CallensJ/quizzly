/**
 * supabase/functions/notify-daily-goal/index.ts
 *
 * Edge Function Supabase — notification email quand l'objectif journalier n'est pas atteint.
 *
 * Déclenchement client-side :
 *   Au démarrage de l'app (hook useGoalNotification), si hier l'objectif
 *   de bonnes réponses n'a pas été atteint et que l'email admin est défini.
 *
 * Payload attendu (JSON) :
 *   {
 *     email:        string    — adresse destinataire (adminEmail)
 *     pseudo:       string    — prénom/pseudo de l'enfant
 *     locale:       'fr'|'en' — langue du message
 *     goalTarget:   number    — objectif (bonnes réponses)
 *     goalAchieved: number    — réponses correctes réelles hier
 *     date:         string    — YYYY-MM-DD (hier)
 *   }
 *
 * Variables d'environnement requises (Supabase Dashboard → Secrets) :
 *   - RESEND_API_KEY       : clé API Resend
 *   - REPORT_FROM_EMAIL    : adresse expéditeur (domaine vérifié Resend)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API    = 'https://api.resend.com/emails';
const ALLOWED_ORIGIN = '*';

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed');

  let payload: {
    email:        string;
    pseudo:       string;
    locale:       'fr' | 'en';
    goalTarget:   number;
    goalAchieved: number;
    date:         string;
  };

  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, 'Invalid JSON payload');
  }

  const { email, pseudo, locale, goalTarget, goalAchieved, date } = payload;

  if (!email || !pseudo || goalTarget === undefined || goalAchieved === undefined) {
    return errorResponse(400, 'Missing required fields: email, pseudo, goalTarget, goalAchieved');
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') ?? 'notifications@erudia.app';

  if (!resendKey) {
    console.error('[notify-daily-goal] RESEND_API_KEY manquante');
    return errorResponse(500, 'Email service not configured');
  }

  const isFr = locale !== 'en';
  const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString(
    isFr ? 'fr-FR' : 'en-GB',
    { weekday: 'long', day: '2-digit', month: 'long' }
  );

  const subject = isFr
    ? `${pseudo} n'a pas atteint son objectif hier (${goalAchieved}/${goalTarget})`
    : `${pseudo} didn't reach yesterday's goal (${goalAchieved}/${goalTarget})`;

  const htmlBody = isFr
    ? buildEmailHtmlFr(pseudo, goalTarget, goalAchieved, dateLabel)
    : buildEmailHtmlEn(pseudo, goalTarget, goalAchieved, dateLabel);

  try {
    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `Erudia <${fromEmail}>`,
        to:      [email],
        subject,
        html:    htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error(`[notify-daily-goal] Resend error ${resendRes.status}:`, errText);
      return errorResponse(502, 'Failed to send email');
    }

    const result = await resendRes.json();
    console.log(`[notify-daily-goal] Email envoyé → ${email}, id: ${result?.id}`);
    return jsonResponse(200, { success: true, id: result?.id });

  } catch (err) {
    console.error('[notify-daily-goal] Fetch error:', err);
    return errorResponse(500, 'Internal server error');
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorResponse(status: number, message: string): Response {
  return jsonResponse(status, { error: message });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    },
  });
}

function buildEmailHtmlFr(pseudo: string, goalTarget: number, goalAchieved: number, dateLabel: string): string {
  const missing = goalTarget - goalAchieved;
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Objectif non atteint — Erudia</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8f7ff;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;">Erudia</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
        Suivi de l'objectif de <strong>${pseudo}</strong>
      </p>
    </div>

    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        Bonjour,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        <strong>${pseudo}</strong> n'a pas atteint son objectif journalier
        le <strong>${dateLabel}</strong>.
      </p>

      <div style="background:#fff8e1;border-radius:8px;padding:20px;margin-bottom:20px;border-left:3px solid #FFD700;">
        <p style="margin:0;font-size:16px;color:#1a1a2e;font-weight:700;">
          ${goalAchieved} / ${goalTarget} bonnes réponses
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">
          Il manquait ${missing} bonne${missing > 1 ? 's' : ''} réponse${missing > 1 ? 's' : ''} pour atteindre l'objectif.
        </p>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        C'est une occasion d'encourager ${pseudo} à faire quelques quiz aujourd'hui !
      </p>

      <div style="background:#f8f7ff;border-radius:8px;padding:16px;border-left:3px solid #667eea;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          Pour modifier l'objectif ou désactiver ces notifications,
          rendez-vous dans l'<strong>Espace Parent</strong> &gt; <em>Objectif journalier</em>.
        </p>
      </div>
    </div>

    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Erudia — Application éducative pour les 6–11 ans<br>
        Notification confidentielle — réservée aux parents
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

function buildEmailHtmlEn(pseudo: string, goalTarget: number, goalAchieved: number, dateLabel: string): string {
  const missing = goalTarget - goalAchieved;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goal not reached — Erudia</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8f7ff;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;">Erudia</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
        Goal tracking for <strong>${pseudo}</strong>
      </p>
    </div>

    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        Hello,
      </p>
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        <strong>${pseudo}</strong> didn't reach their daily goal on <strong>${dateLabel}</strong>.
      </p>

      <div style="background:#fff8e1;border-radius:8px;padding:20px;margin-bottom:20px;border-left:3px solid #FFD700;">
        <p style="margin:0;font-size:16px;color:#1a1a2e;font-weight:700;">
          ${goalAchieved} / ${goalTarget} correct answers
        </p>
        <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">
          ${missing} more correct answer${missing > 1 ? 's were' : ' was'} needed to reach the goal.
        </p>
      </div>

      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        This is a great opportunity to encourage ${pseudo} to do a few quizzes today!
      </p>

      <div style="background:#f8f7ff;border-radius:8px;padding:16px;border-left:3px solid #667eea;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          To update the goal or turn off these notifications,
          go to the <strong>Parent Space</strong> &gt; <em>Daily Goal</em> section.
        </p>
      </div>
    </div>

    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Erudia — Educational app for ages 6–11<br>
        Confidential notification — for parents only
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}
