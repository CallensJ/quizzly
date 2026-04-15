'use client';

/**
 * src/components/features/admin/AdminErrorBoundary.tsx
 *
 * Error boundary isolé par section de l'AdminScreen.
 * Empêche qu'un crash dans un sous-composant produise une page blanche entière.
 * En production, affiche un message générique. En dev, affiche le message d'erreur.
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  label: string;
}

interface State {
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="admin__section admin__section--error">
          <p>Une erreur est survenue dans cette section ({this.props.label}).</p>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ fontSize: 11, color: 'red', whiteSpace: 'pre-wrap' }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
