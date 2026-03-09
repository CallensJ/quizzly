/**
 * src/lib/sound.ts
 *
 * Service audio centralisé pour les retours sonores du quiz.
 * Utilise Howler.js pour le support multi-format (.webm prioritaire, .mp3 fallback).
 *
 * Initialisation paresseuse : les instances Howl ne sont créées qu'au premier appel
 * à playSound(), ce qui évite tout crash SSR (Next.js) et accélère le démarrage.
 *
 * Convention des fichiers :
 *   public/sounds/<id>.webm  (format privilégié — plus léger)
 *   public/sounds/<id>.mp3   (fallback universel)
 *
 * Sons attendus :
 *   correct, wrong, streak, badge, timer-urgent, finish
 *   timer-expired → timer-expired.mp3
 */

import { Howl } from 'howler';

// Identifiants de tous les sons disponibles dans l'app
export type SoundId =
  | 'correct'
  | 'wrong'
  | 'streak'
  | 'badge'
  | 'timer-urgent'
  | 'timer-expired'
  | 'finish';

// Map des instances Howl — null jusqu'au premier appel (lazy init)
let sounds: Partial<Record<SoundId, Howl>> | null = null;

/** Construit toutes les instances Howl. Appelé une seule fois côté client. */
function buildSounds(): Partial<Record<SoundId, Howl>> {
  // Sons disponibles — streak exclu (fichier audio manquant)
  // Le nom de fichier peut différer de l'id via la propriété `file` optionnelle
  const config: Partial<Record<SoundId, { volume: number; file?: string }>> = {
    correct:          { volume: 0.65 },
    wrong:            { volume: 0.55 },
    badge:            { volume: 0.8 },
    'timer-urgent':   { volume: 0.5 },
    'timer-expired':  { volume: 0.7 }, // fichier : timer-expired.mp3
    finish:           { volume: 0.7 },
  };

  return Object.fromEntries(
    (Object.entries(config) as [SoundId, { volume: number; file?: string }][]).map(([id, opts]) => [
      id,
      new Howl({
        // Utilise le nom de fichier personnalisé si fourni, sinon l'id directement
        src: [`/sounds/${opts.file ?? id}.mp3`],
        volume: opts.volume,
        preload: true,
        // Silencieux si le fichier est absent (développement sans assets)
        onloaderror: () => {},
      }),
    ])
  ) as Partial<Record<SoundId, Howl>>;
}

/**
 * Joue un son identifié par son SoundId.
 *
 * @param id        - Identifiant du son à jouer
 * @param enabled   - Préférence utilisateur (soundEnabled depuis profileStore)
 *
 * Ne fait rien si : côté serveur, sons désactivés, ou fichier audio absent.
 */
export function playSound(id: SoundId, enabled: boolean): void {
  if (!enabled) return;
  if (typeof window === 'undefined') return;

  // Initialisation paresseuse — une seule fois par session navigateur
  if (!sounds) sounds = buildSounds();

  sounds[id]?.play();
}
