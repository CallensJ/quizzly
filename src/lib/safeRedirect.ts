/**
 * src/lib/safeRedirect.ts
 *
 * Protection contre les Open Redirects.
 * Une URL de redirection est "sûre" si et seulement si elle appartient
 * à la même origine que l'app (même domaine, pas d'URL externe).
 *
 * Cas d'usage : paramètre ?next= après une connexion
 *   - Sûr  : /fr/subscribe, /en/dashboard
 *   - Dangereux : https://evil.com, //evil.com, javascript:alert(1)
 *
 * Usage :
 *   const redirectTo = getSafeRedirect(searchParams.get('next'), '/admin')
 *   router.replace(redirectTo)
 */

/**
 * Vérifie qu'une URL est sûre pour une redirection interne.
 * Accepte uniquement les chemins relatifs commençant par '/'
 * et appartenant à la même origine.
 */
export function isSafeRedirect(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    // Les URLs absolues (http://, https://, //, javascript:...) sont rejetées
    // Seuls les chemins relatifs commençant par '/' sont acceptés
    if (!url.startsWith('/') || url.startsWith('//')) return false;

    // Vérification supplémentaire côté navigateur : même origine
    if (typeof window !== 'undefined') {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin;
    }

    // Côté serveur : vérifier qu'il n'y a pas d'autorité dans le chemin
    // (ex: /\evil.com serait interprété comme //evil.com sur certains navigateurs)
    const withoutLeadingSlash = url.slice(1);
    return !withoutLeadingSlash.startsWith('/') && !withoutLeadingSlash.startsWith('\\');
  } catch {
    return false;
  }
}

/**
 * Retourne l'URL de redirection si elle est sûre, sinon le fallback.
 */
export function getSafeRedirect(url: string | null | undefined, fallback: string): string {
  return isSafeRedirect(url) ? url! : fallback;
}
