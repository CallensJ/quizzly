'use client';

/**
 * src/components/mascotte/NovaProvider.tsx
 *
 * Wrapper client minimal permettant de monter NovaMascot dans layout.tsx
 * (qui est un Server Component et ne peut pas importer directement du code client).
 *
 * Nova est ainsi disponible sur TOUTES les pages : Onboarding, Home, Quiz, etc.
 */

import NovaMascot from './NovaMascot';

export default function NovaProvider() {
  return <NovaMascot />;
}
