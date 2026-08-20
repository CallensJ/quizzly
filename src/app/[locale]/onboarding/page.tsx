'use client';

/**
 * src/app/[locale]/onboarding/page.tsx
 *
 * Route /onboarding — création d'un nouveau profil joueur.
 * Accessible même si des profils existent déjà sur l'appareil (contrairement à
 * la route /, elle ne redirige pas dans ce cas) — utilisée aussi par
 * "Nouveau joueur" dans PlayerSwitcherModal pour ajouter un 2e/3e enfant.
 *
 * Protégée par src/proxy.ts (compte parent requis) depuis le lot essai 7 jours
 * (cahier v1.4 §5) : un compte déjà connecté passe sans friction, un visiteur
 * sans session est redirigé vers /auth/login?next=/onboarding.
 */

import OnboardingScreen from '@/components/features/onboarding/OnboardingScreen';

export default function OnboardingPage() {
  return <OnboardingScreen />;
}
