/**
 * scripts/analyze-math.ts
 *
 * Analyse les fichiers de questions mathématiques FR et EN :
 * - Compte par niveau (easy/medium/hard)
 * - Détecte les questions en français dans le fichier EN
 * - Détecte les doublons (intra + inter fichiers)
 * - Analyse la distribution des réponses correctes
 * - Signale les données manquantes ou incohérentes
 *
 * Usage : npx tsx scripts/analyze-math.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface Question {
  id: string;
  question: string;
  options: Record<string, string> | string[];
  answer?: string;          // Format A : "A" | "B" | "C" | "D"
  correctAnswer?: string;   // Format B : valeur exacte
  difficulty: string;
  category: string;
  locale?: string;
}

/** Retourne la valeur de la bonne réponse */
function getCorrectValue(q: Question): string {
  if (typeof q.answer === 'string' && !Array.isArray(q.options)) {
    return (q.options as Record<string, string>)[q.answer] ?? '';
  }
  return q.correctAnswer ?? '';
}

/** Retourne les options sous forme de tableau de valeurs */
function getOptionsArray(q: Question): string[] {
  if (Array.isArray(q.options)) return q.options;
  return Object.values(q.options as Record<string, string>);
}

const FRENCH_MARKERS = [
  /^combien/i, /^quelle?/i, /^calculez/i, /^résolvez/i, /^trouvez/i,
  /^simplifiez/i, /^développez/i, /^factorisez/i, /^déterminez/i,
  /^convertissez/i, /^donnez/i, /^écrivez/i, /\bvaut\b/i, /\best égal\b/i,
  /\bde la\b/i, /\ble résultat\b/i, /\bles\b.*\bsont\b/i,
  /\bdans\b/i, /\bavec\b/i, /\bpour\b/i, /\bsont\b/i,
  /\bnombre\b/i, /\bvaleur\b/i, /\bsuivant\b/i, /\bsuivante\b/i,
  /\bégal\b/i, /\bégale\b/i,
];

function isFrench(text: string): boolean {
  return FRENCH_MARKERS.some(r => r.test(text));
}

function loadFile(path: string): Question[] {
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  if (Array.isArray(raw)) return raw;
  if (raw.questions) return raw.questions as Question[];
  return Object.values(raw).flat() as Question[];
}

function analyzeAnswerDistribution(questions: Question[]) {
  // Pour format A (options objet), la "position" est la clé (A=0, B=1, C=2, D=3)
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const unmatched: string[] = [];

  for (const q of questions) {
    if (!Array.isArray(q.options) && q.answer) {
      const keys = Object.keys(q.options as Record<string, string>);
      const idx = keys.indexOf(q.answer);
      if (idx === -1) unmatched.push(q.id);
      else counts[idx] = (counts[idx] || 0) + 1;
    } else {
      const opts = getOptionsArray(q);
      const correct = getCorrectValue(q);
      const idx = opts.indexOf(correct);
      if (idx === -1) unmatched.push(q.id);
      else counts[idx] = (counts[idx] || 0) + 1;
    }
  }

  return { counts, unmatched };
}

function findDuplicates(questions: Question[], label: string): Map<string, string[]> {
  const byText = new Map<string, string[]>();
  for (const q of questions) {
    const key = q.question.trim().toLowerCase();
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key)!.push(q.id);
  }
  const dupes = new Map<string, string[]>();
  for (const [text, ids] of byText) {
    if (ids.length > 1) dupes.set(text, ids);
  }
  return dupes;
}

function findDuplicateIds(questions: Question[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) dupes.push(q.id);
    else seen.add(q.id);
  }
  return dupes;
}

function countByDifficulty(questions: Question[]) {
  const counts: Record<string, number> = {};
  for (const q of questions) {
    counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
  }
  return counts;
}

function validateQuality(questions: Question[]) {
  const issues: { id: string; problem: string }[] = [];
  for (const q of questions) {
    if (!q.question?.trim()) issues.push({ id: q.id, problem: 'question vide' });
    const opts = getOptionsArray(q);
    if (opts.length < 2) issues.push({ id: q.id, problem: 'options insuffisantes' });
    const correct = getCorrectValue(q);
    if (!correct) issues.push({ id: q.id, problem: 'réponse correcte manquante' });
    else if (!opts.includes(correct))
      issues.push({ id: q.id, problem: `réponse "${correct}" absente des options` });
  }
  return issues;
}

// ───────────────────────────────────────────────
const BASE = join(process.cwd(), 'src/data/questions');
const frQuestions = loadFile(join(BASE, 'fr/math.json'));
const enQuestions = loadFile(join(BASE, 'en/math.json'));

console.log('\n══════════════════════════════════════════');
console.log('  ANALYSE — Mathématiques FR');
console.log('══════════════════════════════════════════');
console.log(`Total : ${frQuestions.length} questions`);
console.log('Par niveau :', countByDifficulty(frQuestions));

const frQuality = validateQuality(frQuestions);
console.log(`Problèmes qualité : ${frQuality.length}`);
if (frQuality.length > 0) frQuality.forEach(p => console.log(`  ⚠ [${p.id}] ${p.problem}`));

const frDupeText = findDuplicates(frQuestions, 'FR');
console.log(`Doublons (même texte) : ${frDupeText.size}`);
frDupeText.forEach((ids, text) => console.log(`  ↳ "${text.slice(0, 60)}..." → ${ids.join(', ')}`));

const frDupeIds = findDuplicateIds(frQuestions);
console.log(`Doublons d'ID : ${frDupeIds.length}`);
if (frDupeIds.length > 0) console.log(' ', frDupeIds.join(', '));

const frDist = analyzeAnswerDistribution(frQuestions);
console.log('\nDistribution réponses correctes :');
const frTotal = frQuestions.length - frDist.unmatched.length;
[0,1,2,3].forEach(i => {
  const pct = frTotal > 0 ? ((frDist.counts[i] / frTotal) * 100).toFixed(1) : '0';
  console.log(`  Position ${i} : ${frDist.counts[i]} (${pct}%)`);
});
if (frDist.unmatched.length > 0) console.log(`  ⚠ correctAnswer introuvable dans options : ${frDist.unmatched.length} questions`);

// ───────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log('  ANALYSE — Mathématiques EN');
console.log('══════════════════════════════════════════');
console.log(`Total : ${enQuestions.length} questions`);
console.log('Par niveau :', countByDifficulty(enQuestions));

const enFrench = enQuestions.filter(q => isFrench(q.question));
console.log(`\nQuestions en FRANÇAIS dans le fichier EN : ${enFrench.length}`);
enFrench.forEach(q => console.log(`  [${q.id}] (${q.difficulty}) ${q.question.slice(0, 80)}`));

const enQuality = validateQuality(enQuestions);
console.log(`\nProblèmes qualité : ${enQuality.length}`);
if (enQuality.length > 0) enQuality.forEach(p => console.log(`  ⚠ [${p.id}] ${p.problem}`));

const enDupeText = findDuplicates(enQuestions, 'EN');
console.log(`Doublons (même texte) : ${enDupeText.size}`);
enDupeText.forEach((ids, text) => console.log(`  ↳ "${text.slice(0, 60)}..." → ${ids.join(', ')}`));

const enDupeIds = findDuplicateIds(enQuestions);
console.log(`Doublons d'ID : ${enDupeIds.length}`);
if (enDupeIds.length > 0) console.log(' ', enDupeIds.join(', '));

const enDist = analyzeAnswerDistribution(enQuestions);
console.log('\nDistribution réponses correctes :');
const enTotal = enQuestions.length - enDist.unmatched.length;
[0,1,2,3].forEach(i => {
  const pct = enTotal > 0 ? ((enDist.counts[i] / enTotal) * 100).toFixed(1) : '0';
  console.log(`  Position ${i} : ${enDist.counts[i]} (${pct}%)`);
});
if (enDist.unmatched.length > 0) console.log(`  ⚠ correctAnswer introuvable dans options : ${enDist.unmatched.length} questions`);

// ───────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log('  DOUBLONS INTER-FICHIERS (FR ↔ EN)');
console.log('══════════════════════════════════════════');
const frTexts = new Map(frQuestions.map(q => [q.question.trim().toLowerCase(), q.id]));
const interDupes: { frId: string; enId: string; text: string }[] = [];
for (const enQ of enQuestions) {
  if (typeof enQ.question !== 'string') continue;
  const key = enQ.question.trim().toLowerCase();
  if (frTexts.has(key)) {
    interDupes.push({ frId: frTexts.get(key)!, enId: enQ.id, text: enQ.question.slice(0, 60) });
  }
}
console.log(`Questions identiques entre FR et EN : ${interDupes.length}`);
interDupes.forEach(d => console.log(`  FR[${d.frId}] = EN[${d.enId}] : "${d.text}..."`));

console.log('\n══════════════════════════════════════════\n');
