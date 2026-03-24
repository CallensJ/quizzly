/**
 * src/app/[locale]/offline/page.tsx
 *
 * Page de fallback offline servie par le Service Worker
 * quand aucune page n'est disponible en cache et que le réseau est coupé.
 *
 * Design : cohérent avec l'identité Erudia (Nova mascotte, couleurs primary).
 * Fonctionnement : détecte le retour de connexion et redirige automatiquement.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();
  const [isBack, setIsBack] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsBack(true);
      // Petit délai pour laisser l'animation jouer
      setTimeout(() => router.replace("/"), 1500);
    };

    window.addEventListener("online", handleOnline);

    // Vérifier si on est déjà revenu en ligne
    if (navigator.onLine) {
      handleOnline();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff",
        fontFamily: "Nunito, sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      {/* Nova mascotte simplifiée — emoji fallback si SVG pas en cache */}
      <div
        style={{
          fontSize: "80px",
          marginBottom: "24px",
          animation: "float 3s ease-in-out infinite",
        }}
      >
        🦉
      </div>

      <h1
        style={{
          fontSize: "28px",
          fontWeight: 800,
          margin: "0 0 12px",
        }}
      >
        {isBack ? "Connexion retrouvée !" : "Oups, pas de connexion !"}
      </h1>

      <p
        style={{
          fontSize: "16px",
          opacity: 0.9,
          maxWidth: "400px",
          lineHeight: 1.6,
          margin: "0 0 32px",
        }}
      >
        {isBack
          ? "On te ramène au quiz..."
          : "Nova a besoin d'internet pour charger cette page. Reconnecte-toi et on reprend !"}
      </p>

      {!isBack && (
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "Nunito, sans-serif",
            padding: "14px 32px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            transition: "all 0.2s ease",
          }}
        >
          Réessayer
        </button>
      )}

      {isBack && (
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
