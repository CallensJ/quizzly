/**
 * supabase/functions/send-report/index.ts
 *
 * Edge Function Supabase — envoi du rapport de progression par email.
 *
 * Déclenchement :
 *   - Manuel : appelée depuis ReportSection.tsx (bouton "Envoyer par email")
 *   - Automatique : peut être déclenchée par pg_cron pour les rapports hebdo/mensuel
 *     (exemple cron dans les commentaires ci-dessous)
 *
 * Payload attendu (JSON) :
 *   {
 *     email:       string    — adresse destinataire (admin_settings.admin_email)
 *     pseudo:      string    — prénom/pseudo de l'enfant
 *     locale:      'fr'|'en' — langue du rapport
 *     pdfBase64:   string    — PDF encodé en base64 (généré côté client)
 *     generatedAt: string    — ISO date de génération
 *   }
 *
 * Variables d'environnement requises (Supabase Dashboard → Edge Functions → Secrets) :
 *   - RESEND_API_KEY       : clé API Resend (https://resend.com)
 *   - REPORT_FROM_EMAIL    : adresse expéditeur (ex: rapports@erudia.app)
 *                            doit être un domaine vérifié dans Resend
 *
 * Exemple pg_cron pour envoi hebdomadaire (chaque lundi à 8h00 UTC) :
 *   SELECT cron.schedule(
 *     'weekly-reports',
 *     '0 8 * * 1',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/send-report-cron',
 *       headers := '{"Authorization":"Bearer <service_role_key>"}'::jsonb
 *     )$$
 *   );
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Constantes ───────────────────────────────────────────────────────────────

const RESEND_API     = 'https://api.resend.com/emails';
const ALLOWED_ORIGIN = 'https://app.erudia.app';

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
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

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  // Vérification JWT — rejette toute requête non authentifiée
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(401, 'Unauthorized');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return errorResponse(401, 'Unauthorized');
  }

  // Lecture et validation du payload
  let payload: {
    email:       string;
    pseudo:      string;
    locale:      'fr' | 'en';
    pdfBase64:   string;
    generatedAt: string;
  };

  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, 'Invalid JSON payload');
  }

  const { email, pseudo, locale, pdfBase64, generatedAt } = payload;

  if (!email || !pseudo || !pdfBase64) {
    return errorResponse(400, 'Missing required fields: email, pseudo, pdfBase64');
  }

  // Variables d'environnement
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('REPORT_FROM_EMAIL') ?? 'rapports@erudia.app';

  if (!resendKey) {
    console.error('[send-report] RESEND_API_KEY manquante');
    return errorResponse(500, 'Email service not configured');
  }

  // Construction du contenu email
  const isFr     = locale !== 'en';
  const dateLabel = new Date(generatedAt).toLocaleDateString(
    isFr ? 'fr-FR' : 'en-GB',
    { day: '2-digit', month: 'long', year: 'numeric' }
  );
  const subject = isFr
    ? `Rapport de progression de ${pseudo} — ${dateLabel}`
    : `${pseudo}'s Progress Report — ${dateLabel}`;

  const htmlBody = isFr
    ? buildEmailHtmlFr(pseudo, dateLabel)
    : buildEmailHtmlEn(pseudo, dateLabel);

  // Nom du fichier PDF
  const filename = isFr
    ? `rapport-${pseudo}-${generatedAt.split('T')[0]}.pdf`
    : `report-${pseudo}-${generatedAt.split('T')[0]}.pdf`;

  // Appel à l'API Resend
  try {
    const resendRes = await fetch(RESEND_API, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `Erudia <${fromEmail}>`,
        to:      [email],
        subject,
        html:    htmlBody,
        attachments: [
          {
            filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error(`[send-report] Resend error ${resendRes.status}:`, errText);
      return errorResponse(502, 'Failed to send email');
    }

    const result = await resendRes.json();
    console.log(`[send-report] Email envoyé → ${email}, id: ${result?.id}`);

    return jsonResponse(200, { success: true, id: result?.id });

  } catch (err) {
    console.error('[send-report] Fetch error:', err);
    return errorResponse(500, 'Internal server error');
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

/** Corps HTML de l'email en français */
function buildEmailHtmlFr(pseudo: string, dateLabel: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de progression Erudia</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8f7ff;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;">Erudia</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
        Rapport de progression de <strong>${pseudo}</strong>
      </p>
    </div>

    <!-- Corps -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        Bonjour,<br><br>
        Veuillez trouver ci-joint le rapport de progression de <strong>${pseudo}</strong>
        généré le <strong>${dateLabel}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        Ce rapport contient les statistiques globales, les badges obtenus,
        les performances par catégorie et les 10 dernières parties.
      </p>

      <div style="background:#f8f7ff;border-radius:8px;padding:16px;border-left:3px solid #667eea;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          Pour modifier la fréquence d'envoi ou désactiver ces rapports,
          rendez-vous dans l'<strong>Espace Parent</strong> &gt; section <em>Rapport de progression</em>.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Erudia — Application éducative pour les 6-11 ans<br>
        Rapport confidentiel — réservé aux parents
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/** Corps HTML de l'email en anglais */
function buildEmailHtmlEn(pseudo: string, dateLabel: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erudia Progress Report</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8f7ff;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:28px 32px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:800;">Erudia</h1>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
        Progress report for <strong>${pseudo}</strong>
      </p>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;color:#1a1a2e;line-height:1.6;">
        Hello,<br><br>
        Please find attached the progress report for <strong>${pseudo}</strong>,
        generated on <strong>${dateLabel}</strong>.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        This report includes overall statistics, earned badges,
        performance by category and the last 10 games.
      </p>

      <div style="background:#f8f7ff;border-radius:8px;padding:16px;border-left:3px solid #667eea;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          To change the report frequency or unsubscribe, go to the
          <strong>Parent Space</strong> &gt; <em>Progress Report</em> section.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Erudia — Educational app for ages 6-11<br>
        Confidential report — for parents only
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}
