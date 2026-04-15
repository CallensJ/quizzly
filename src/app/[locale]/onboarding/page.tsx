'use client';

/**
 * src/app/[locale]/onboarding/page.tsx
 *
 * Route /onboarding — création d'un nouveau profil joueur.
 * Toujours accessible, même si des profils existent déjà sur l'appareil.
 * Utilisé notamment par "Nouveau joueur" dans PlayerSwitcherModal.
 *
 * Contrairement à la route /, elle ne redirige pas si des profils existent.
 */

import OnboardingScreen from '@/components/features/onboarding/OnboardingScreen';

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
