'use client';

/**
 * src/components/features/quiz/QuizScreen.tsx
 *
 * Écran principal du quiz. Affiche les questions une par une,
 * gère le feedback visuel et la progression.
 *
 * Flux :
 *   status 'idle'     → redirige vers /home (accès URL direct ou refresh)
 *   status 'playing'  → affiche la question courante
 *   status 'finished' → enregistre la session + badge si seuil atteint → /results
 *
 * État géré par quizStore (non persisté — session mémoire uniquement).
 * La session terminée est persistée dans profileStore (localStorage).
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuizStore } from '@/stores/quizStore';
import { useProfileStore } from '@/stores/profileStore';
import type { AnswerKey } from '@/types';

// Seuil d'obtention du badge : 20% de bonnes réponses = 4/20
const BADGE_THRESHOLD = 4;

// Ordre fixe d'affichage des boutons réponse
const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

export default function QuizScreen() {
  const t = useTranslations('quiz');
  const tHome = useTranslations('home'); // réutilise les labels catégorie + difficulté
  const router = useRouter();

  const {
    status, questions, currentIndex, score, selectedAnswer, category, difficulty,
    selectAnswer, nextQuestion,
  } = useQuizStore();

  const { addSession, earnBadge } = useProfileStore();

  const question = questions[currentIndex];
  const total = questions.length;
  const isAnswered = selectedAnswer !== null;

  // ── Garde : quiz non démarré → retour Home ──────────────────────────────
  useEffect(() => {
    if (status === 'idle') {
      router.replace('/home');
    }
  }, [status, router]);

  // ── Fin de partie : enregistrement + redirection ─────────────────────────
  useEffect(() => {
    if (status === 'finished') {
      if (category && difficulty) {
        addSession({ category, difficulty, score, totalQuestions: total });
        // Badge si score ≥ 20% (4 bonnes réponses sur 20)
        if (score >= BADGE_THRESHOLD) earnBadge();
      }
      router.push('/results');
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!question || status !== 'playing') return null;

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Retourne la classe CSS d'un bouton réponse selon l'état de la question.
   * Après sélection : colore correct (vert), incorrect (rouge),
   * révèle la bonne réponse et grise les autres.
   */
  function getAnswerClass(key: AnswerKey): string {
    if (!isAnswered) return 'quiz__answer';
    const isCorrectKey = key === question.answer;
    const isSelectedKey = key === selectedAnswer;
    if (isSelectedKey && isCorrectKey)  return 'quiz__answer quiz__answer--correct';
    if (isSelectedKey && !isCorrectKey) return 'quiz__answer quiz__answer--wrong';
    if (!isSelectedKey && isCorrectKey) return 'quiz__answer quiz__answer--reveal';
    return 'quiz__answer quiz__answer--disabled';
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="quiz">

      {/* ── Header : progression + métadonnées ───────────────────────────── */}
      <header className="quiz__header">
        <div className="quiz__header-top">
          <span className="quiz__cat-label">
            {category === 'sciences' ? '🔬' : '📜'} {tHome(category!)}
          </span>
          <span className="quiz__score">
            ⭐ {score} pt{score !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="quiz__meta">
          <span className="quiz__counter">
            {t('question', { current: currentIndex + 1, total })}
          </span>
          {difficulty && (
            <span className={`quiz__diff-chip quiz__diff-chip--${difficulty}`}>
              {tHome(difficulty)}
            </span>
          )}
        </div>

        {/* Barre de progression — avance au chargement de chaque nouvelle question */}
        <div
          className="quiz__progress-bar"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemax={total}
          aria-label={t('question', { current: currentIndex + 1, total })}
        >
          <div
            className="quiz__progress-fill"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {/* ── Corps : question + réponses + feedback + suivant ─────────────── */}
      <main className="quiz__body">

        {/* Carte question */}
        <div className="quiz__question-card">
          <p className="quiz__question-text">{question.question}</p>
        </div>

        {/* Feedback — slide-in après sélection d'une réponse */}
        {isAnswered && (
          <div
            className={`quiz__feedback quiz__feedback--${
              selectedAnswer === question.answer ? 'correct' : 'wrong'
            }`}
            role="alert"
          >
            {selectedAnswer === question.answer
              ? t('feedbackCorrect')
              : t('feedbackWrong')}
          </div>
        )}

        {/* Boutons réponse A / B / C / D */}
        <div className="quiz__answers" role="group" aria-label="Choix de réponse">
          {ANSWER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={getAnswerClass(key)}
              onClick={() => !isAnswered && selectAnswer(key)}
              // Désactive uniquement les mauvaises réponses après sélection
              disabled={isAnswered && key !== question.answer && key !== selectedAnswer}
              aria-pressed={selectedAnswer === key}
            >
              <span className="quiz__answer-key" aria-hidden="true">{key}</span>
              <span className="quiz__answer-text">{question.options[key]}</span>
            </button>
          ))}
        </div>

        {/* Bouton Suivant — fade-in après sélection */}
        {isAnswered && (
          <button
            type="button"
            className="quiz__next-btn"
            onClick={nextQuestion}
          >
            {currentIndex < total - 1 ? t('ctaNext') : t('ctaFinish')}
          </button>
        )}

      </main>
    </div>
  );
}
