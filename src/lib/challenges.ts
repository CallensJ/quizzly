/**
 * src/lib/challenges.ts
 *
 * Logique métier du mode multijoueur — Duel asynchrone (MVP 4).
 * Toutes les interactions Supabase avec la table `challenges` sont centralisées ici.
 *
 * Flux :
 *   Joueur A joue un quiz → createChallenge() → reçoit code 6 chars
 *   Joueur B entre le code → joinChallenge() → joue les mêmes questions → completeChallenge()
 *   Les deux joueurs voient l'historique via fetchMyChallenges()
 *
 * Stratégie polling :
 *   pollChallenge() est appelé depuis ChallengesScreen toutes les 30s
 *   pour détecter quand Joueur B a joué un défi en attente.
 */

import { supabase } from '@/lib/supabase';
import type { Challenge, Category, Difficulty, Locale, AgeGroup, Question } from '@/types';

// ─── Génération du code ────────────────────────────────────────────────────────

// Caractères lisibles sans ambiguïté (pas de 0/O, 1/I, 5/S)
const CODE_CHARS = 'BCDFGHJKLMNPQRTVWXYZ2346789';
const CODE_LENGTH = 6;
const MAX_RETRY = 10; // tentatives max pour garantir l'unicité

function generateCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

// ─── Création d'un challenge (Joueur A) ───────────────────────────────────────

export interface CreateChallengeParams {
  pseudo: string;
  avatarId: string;
  category: Category;
  difficulty: Difficulty;
  locale: Locale;
  ageGroup: AgeGroup;
  questions: Question[];   // snapshot des 20 questions jouées par A (ordre fixe)
  scoreA: number;
}

/**
 * Crée un nouveau défi en base après qu'un quiz soit terminé.
 * Retourne le code court (ex: "ZBRE7K") à partager avec l'adversaire.
 * Expire automatiquement 12h après création.
 */
export async function createChallenge(params: CreateChallengeParams): Promise<string> {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  let attempt = 0;
  while (attempt < MAX_RETRY) {
    const code = generateCode();

    const { error } = await supabase.from('challenges').insert({
      code,
      created_by: params.pseudo,
      avatar_a: params.avatarId,
      category: params.category,
      difficulty: params.difficulty,
      locale: params.locale,
      age_group: params.ageGroup,
      // Sérialisation du snapshot — stocké en jsonb dans Supabase
      questions: params.questions,
      score_a: params.scoreA,
      total: params.questions.length,
      status: 'pending',
      expires_at: expiresAt,
    });

    // UNIQUE constraint sur `code` → si collision, réessayer avec un nouveau code
    if (!error) return code;
    if (error.code !== '23505') throw error; // erreur inattendue

    attempt++;
  }

  throw new Error('Impossible de générer un code unique après plusieurs tentatives.');
}

// ─── Rejoindre un challenge (Joueur B) ────────────────────────────────────────

export type JoinError =
  | 'not_found'     // code inconnu
  | 'expired'       // délai 12h dépassé
  | 'completed'     // déjà joué
  | 'same_player';  // Joueur B = Joueur A (interdit)

export interface JoinResult {
  challenge: Challenge;
  error?: never;
}

export interface JoinResultError {
  challenge?: never;
  error: JoinError;
}

/**
 * Vérifie la validité d'un code et retourne le challenge si jouable.
 * Ne modifie pas la base — la mise à jour se fait dans completeChallenge().
 */
export async function joinChallenge(
  code: string,
  pseudo: string
): Promise<JoinResult | JoinResultError> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return { error: 'not_found' };

  const challenge = data as Challenge;

  if (challenge.status === 'expired' || new Date(challenge.expires_at) < new Date()) {
    return { error: 'expired' };
  }
  if (challenge.status === 'completed') {
    return { error: 'completed' };
  }
  if (challenge.created_by === pseudo) {
    return { error: 'same_player' };
  }

  return { challenge };
}

// ─── Compléter un challenge (Joueur B a fini de jouer) ────────────────────────

/**
 * Met à jour le challenge avec le score de Joueur B et détermine le gagnant.
 * Appelé depuis ResultsScreen quand challengeId !== null.
 */
export async function completeChallenge(
  code: string,
  pseudo: string,
  avatarId: string,
  scoreB: number
): Promise<Challenge | null> {
  // D'abord récupérer le score A pour calculer le gagnant
  const { data: existing } = await supabase
    .from('challenges')
    .select('score_a, total')
    .eq('code', code)
    .single();

  if (!existing) return null;

  const scoreA = existing.score_a as number;
  const winner: 'a' | 'b' | 'draw' =
    scoreB > scoreA ? 'b' : scoreB < scoreA ? 'a' : 'draw';

  const { data, error } = await supabase
    .from('challenges')
    .update({
      challenged_by: pseudo,
      avatar_b: avatarId,
      score_b: scoreB,
      winner,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('code', code)
    .select('*')
    .single();

  if (error || !data) return null;
  return data as Challenge;
}

// ─── Récupérer un challenge par code ──────────────────────────────────────────

export async function fetchChallenge(code: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return null;
  return data as Challenge;
}

// ─── Historique des challenges d'un joueur ────────────────────────────────────

/**
 * Retourne les 20 derniers challenges impliquant le pseudo (créé ou rejoint).
 * Utilisé dans la page /challenges pour l'onglet "Mes défis".
 */
export async function fetchMyChallenges(pseudo: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .or(`created_by.eq.${pseudo},challenged_by.eq.${pseudo}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as Challenge[];
}

// ─── Polling — vérifier si un défi en attente a été joué ─────────────────────

/**
 * Récupère le statut actuel d'un challenge.
 * Appelé toutes les 30s depuis ChallengesScreen quand un défi est en attente.
 */
export async function pollChallenge(code: string): Promise<Pick<Challenge, 'status' | 'score_b' | 'challenged_by' | 'winner'> | null> {
  const { data, error } = await supabase
    .from('challenges')
    .select('status, score_b, challenged_by, winner')
    .eq('code', code)
    .single();

  if (error || !data) return null;
  return data as Pick<Challenge, 'status' | 'score_b' | 'challenged_by' | 'winner'>;
}
