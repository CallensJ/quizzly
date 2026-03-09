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

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useQuizStore } from '@/stores/quizStore';
import { useProfileStore } from '@/stores/profileStore';
import Nova, { type NovaState } from '@/components/ui/Nova';
import { playSound } from '@/lib/sound';
import type { AnswerKey } from '@/types';

// Seuil d'obtention du badge : 20% de bonnes réponses = 4/20
const BADGE_THRESHOLD = 4;

// Ordre fixe d'affichage des boutons réponse
const ANSWER_KEYS: AnswerKey[] = ['A', 'B', 'C', 'D'];

// Durée du timer en secondes
const TIMER_DURATION = 15;
// Circonférence du cercle SVG (r=20) : 2π × 20 ≈ 125.66
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 20;

export default function QuizScreen() {
  const t = useTranslations('quiz');
  const tHome = useTranslations('home'); // réutilise les labels catégorie + difficulté
  const tNova = useTranslations('nova');
  const router = useRouter();

  const {
    status, questions, currentIndex, score, selectedAnswer, category, difficulty,
    selectAnswer, nextQuestion,
  } = useQuizStore();

  const { addSession, earnBadge } = useProfileStore();
  const timerEnabled = useProfileStore((s) => s.timerEnabled);
  const soundEnabled = useProfileStore((s) => s.soundEnabled);

  const question = questions[currentIndex];
  const total = questions.length;
  const isAnswered = selectedAnswer !== null;

  // ── Timer optionnel ───────────────────────────────────────────────────────
  // Compte à rebours de 15s par question. Réinitialisé à chaque nouvelle question.
  // Si le temps est écoulé, une mauvaise réponse est sélectionnée automatiquement.
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timedOutRef = useRef(false); // évite un double déclenchement

  // Réinitialise le timer à chaque nouvelle question
  useEffect(() => {
    setTimeLeft(TIMER_DURATION);
    timedOutRef.current = false;
  }, [currentIndex]);

  // Décompte seconde par seconde via setTimeout (évite les problèmes de stale closure)
  useEffect(() => {
    if (!timerEnabled || isAnswered || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, timerEnabled, isAnswered]);

  // Son d'urgence — joué une seule fois à l'entrée dans la zone critique (<= 5s)
  const urgentSoundPlayedRef = useRef(false);
  useEffect(() => {
    if (!timerEnabled || isAnswered) return;
    if (timeLeft === 5 && !urgentSoundPlayedRef.current) {
      urgentSoundPlayedRef.current = true;
      playSound('timer-urgent', soundEnabled);
    }
  }, [timeLeft, timerEnabled, isAnswered, soundEnabled]);

  // Réinitialise aussi le flag urgent à chaque nouvelle question
  useEffect(() => {
    urgentSoundPlayedRef.current = false;
  }, [currentIndex]);

  // Auto-sélection d'une mauvaise réponse quand le temps est écoulé
  useEffect(() => {
    if (!timerEnabled || isAnswered || timeLeft > 0 || timedOutRef.current) return;
    timedOutRef.current = true;
    playSound('timer-expired', soundEnabled);
    const wrongKey = ANSWER_KEYS.find((k) => k !== question?.answer);
    if (wrongKey) selectAnswer(wrongKey);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Nova : feedback visuel après chaque réponse ───────────────────────────
  // Les compteurs de série persistent entre les questions de la même partie.
  const consecutiveCorrectRef = useRef(0);
  const consecutiveWrongRef = useRef(0);
  const [novaVisible, setNovaVisible] = useState(false);
  const [novaState, setNovaState] = useState<NovaState>('correct');
  const [novaMessage, setNovaMessage] = useState('');

  useEffect(() => {
    // Quand selectedAnswer revient à null (nextQuestion appelé), on cache Nova
    if (selectedAnswer === null) {
      setNovaVisible(false);
      return;
    }
    if (!question) return;

    const isCorrect = selectedAnswer === question.answer;

    if (isCorrect) {
      consecutiveCorrectRef.current += 1;
      consecutiveWrongRef.current = 0;
      // Streak à partir de 3 bonnes réponses consécutives — son streak prioritaire sur correct
      if (consecutiveCorrectRef.current >= 3) {
        setNovaState('streak');
        setNovaMessage(tNova('streak'));
        playSound('streak', soundEnabled);
      } else {
        setNovaState('correct');
        setNovaMessage(tNova('correct'));
        playSound('correct', soundEnabled);
      }
    } else {
      consecutiveWrongRef.current += 1;
      consecutiveCorrectRef.current = 0;
      // Encouragement à partir de 2 mauvaises réponses consécutives
      if (consecutiveWrongRef.current >= 2) {
        setNovaState('encouragement');
        setNovaMessage(tNova('encouragement'));
      } else {
        setNovaState('wrong');
        setNovaMessage(tNova('wrong'));
      }
      // Un seul son wrong, qu'il soit "wrong" ou "encouragement"
      playSound('wrong', soundEnabled);
    }

    setNovaVisible(true);
  }, [selectedAnswer]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Nova réagit à chaque réponse — overlay bas-droite, disparaît avant le suivant */}
      <Nova
        state={novaState}
        message={novaMessage}
        visible={novaVisible}
        onHide={() => setNovaVisible(false)}
        duration={2500}
      />

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

      {/* Timer circulaire — visible uniquement si timerEnabled et question non répondue */}
      {timerEnabled && !isAnswered && (
        <div
          className={`quiz__timer${timeLeft <= 5 ? ' quiz__timer--urgent' : ''}`}
          aria-live="polite"
          aria-label={`${timeLeft}s`}
        >
          <svg className="quiz__timer-svg" viewBox="0 0 48 48" aria-hidden="true">
            {/* Piste de fond */}
            <circle cx="24" cy="24" r="20" className="quiz__timer-track" />
            {/* Arc de progression — se vide de gauche à droite */}
            <circle
              cx="24"
              cy="24"
              r="20"
              className="quiz__timer-arc"
              strokeDasharray={TIMER_CIRCUMFERENCE}
              strokeDashoffset={TIMER_CIRCUMFERENCE * (1 - timeLeft / TIMER_DURATION)}
            />
          </svg>
          <span className="quiz__timer-count">{timeLeft}</span>
        </div>
      )}

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
              // Distingue réponse manuelle incorrecte et timeout timer
              : timedOutRef.current
                ? t('feedbackTimeout')
                : t('feedbackWrong')}
          </div>
        )}

        {/* Boutons réponse A / B / C / D */}
        <div className="quiz__answers" role="group" aria-label="Choix de réponse">
          {ANSWER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`answer-${key}`}
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
            data-testid="next-btn"
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
