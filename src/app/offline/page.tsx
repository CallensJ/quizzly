'use client';

/**
 * src/app/offline/page.tsx
 *
 * Page de fallback PWA — servie par le service worker quand l'utilisateur
 * est hors-ligne et que la page demandée n'est pas dans le cache.
 *
 * Volontairement sans locale (exclue du middleware next-intl dans proxy.ts)
 * pour fonctionner comme fallback universel sans dépendance serveur.
 *
 * Servie par Workbox via `fallbacks.document: '/offline'` dans next.config.ts.
 */

export default function OfflinePage() {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erudia — Hors ligne</title>
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
            max-width: 360px;
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
            margin-bottom: 1.5rem;
          }
          .tip {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 1rem;
            font-size: 0.875rem;
            color: #475569;
            line-height: 1.5;
          }
          .tip strong { color: #667eea; }
          button {
            margin-top: 1.5rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 14px;
            padding: 0.875rem 2rem;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="emoji">📡</div>
          <h1>Pas de connexion</h1>
          <p>
            Tu es hors ligne pour l&apos;instant.<br />
            Reconnecte-toi pour jouer !
          </p>
          <div className="tip">
            <strong>Astuce :</strong> joue une fois avec le wifi pour que les questions
            se chargent. La prochaine fois, tu pourras jouer même sans internet.
          </div>
          <button onClick={() => window.location.href = '/fr/home'}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
