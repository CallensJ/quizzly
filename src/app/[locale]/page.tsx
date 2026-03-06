'use client';

/**
 * src/app/[locale]/page.tsx
 *
 * Point d'entrée de l'application.
 * Logique de routage côté client basée sur le profil Zustand :
 *   - Pas de profil  → affiche <OnboardingScreen />
 *   - Profil présent → affiche <HomeScreen /> (à implémenter en MVP 1)
 *
 * Note : le composant est 'use client' car Zustand persist lit le localStorage,
 * indisponible lors du rendu serveur. On attend l'hydratation avant d'afficher
 * quoi que ce soit pour éviter un flash de contenu incorrect (hydration mismatch).
 */

import { useEffect, useState } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import OnboardingScreen from '@/components/features/onboarding/OnboardingScreen';

export default function RootPage() {
  const profile = useProfileStore((s) => s.profile);

  // Évite le flash SSR : on n'affiche rien tant que Zustand n'a pas hydraté
  // le store depuis le localStorage (se produit après le premier render client).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (!profile) {
    return <OnboardingScreen />;
  }

  // TODO MVP1 : remplacer par <HomeScreen /> une fois implémenté
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Bonjour {profile.pseudo} !</h1>
      <p>Écran Home — à venir.</p>
    </main>
  );
}
