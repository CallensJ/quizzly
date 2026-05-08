'use client';

// src/components/ui/ThemeApplier.tsx
// Lit le thème du profil actif et l'applique sur <html data-theme="...">.
// Composant sans rendu — effet uniquement.

import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';

export default function ThemeApplier() {
  const theme = useProfileStore((s) => s.profile?.theme ?? 'default');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return null;
}
