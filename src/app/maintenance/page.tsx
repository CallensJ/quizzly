/**
 * src/app/maintenance/page.tsx
 *
 * Page affichée à tous les visiteurs quand MAINTENANCE_MODE=true (voir proxy.ts).
 * Volontairement sans locale (même pattern que /offline) — fallback universel
 * qui ne dépend d'aucun store/layout applicatif.
 *
 * Bilingue sur une seule page plutôt que routée par locale : plus simple à
 * maintenir pour une page temporaire, pas de dépendance au middleware i18n.
 */

export default function MaintenancePage() {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erudia — Bientôt de retour</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Nunito', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .card {
            background: white;
            border-radius: 24px;
            padding: 2.5rem 2rem;
            max-width: 420px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          }
          .emoji { font-size: 3.5rem; line-height: 1; margin-bottom: 1rem; }
          h1 {
            font-size: 1.5rem;
            font-weight: 800;
            color: #1a1a2e;
            margin-bottom: 0.75rem;
          }
          p {
            font-size: 1rem;
            color: #64748b;
            line-height: 1.6;
            margin-bottom: 1rem;
          }
          .divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 1.25rem 0;
          }
          .lang-label {
            font-size: 0.75rem;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="emoji">🦉</div>
          <p className="lang-label">Français</p>
          <h1>Erudia fait sa peau neuve !</h1>
          <p>
            Nous préparons le lancement de la nouvelle version.<br />
            De retour très bientôt.
          </p>
          <hr className="divider" />
          <p className="lang-label">English</p>
          <h1>Erudia is getting a fresh look!</h1>
          <p>
            We&apos;re preparing the launch of the new version.<br />
            Back very soon.
          </p>
        </div>
      </body>
    </html>
  );
}
