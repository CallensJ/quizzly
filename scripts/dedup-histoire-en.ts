/**
 * Script de nettoyage — histoire.json (EN)
 * Supprime les questions dupliquées par texte.
 * En cas de conflit de réponse, conserve la version avec les options les plus
 * distinctives (heuristique : options les plus longues = plus riches sémantiquement).
 * Usage : npx tsx scripts/dedup-histoire-en.ts
 */

import fs from "fs";
import path from "path";

const FILE_PATH = path.resolve(
  __dirname,
  "../src/data/questions/en/histoire.json"
);

interface Question {
  id: string;
  category: string;
  subcategory: string | null;
  locale: string;
  difficulty: string;
  question: string;
  options: Record<string, string>;
  answer: string;
}

interface QuestionFile {
  category: string;
  lang: string;
  questions: Question[];
}

function optionsLength(q: Question): number {
  return Object.values(q.options).join("").length;
}

function dedup(questions: Question[]): {
  unique: Question[];
  removed: { kept: Question; discarded: Question[] }[];
} {
  const seen = new Map<string, Question>();
  const conflicts: { kept: Question; discarded: Question[] }[] = [];
  const discardedIds = new Set<string>();

  for (const q of questions) {
    const key = q.question.trim().toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, q);
    } else {
      const existing = seen.get(key)!;

      // En cas de conflit, garder la version avec les options les plus riches
      if (optionsLength(q) > optionsLength(existing)) {
        const conflict = conflicts.find((c) => c.kept.id === existing.id);
        if (conflict) {
          conflict.discarded.push(existing);
          conflict.kept = q;
        } else {
          conflicts.push({ kept: q, discarded: [existing] });
        }
        discardedIds.add(existing.id);
        seen.set(key, q);
      } else {
        const conflict = conflicts.find((c) => c.kept.id === existing.id);
        if (conflict) {
          conflict.discarded.push(q);
        } else {
          conflicts.push({ kept: existing, discarded: [q] });
        }
        discardedIds.add(q.id);
      }
    }
  }

  const unique = questions.filter((q) => !discardedIds.has(q.id));
  return { unique, removed: conflicts };
}

function countByDifficulty(questions: Question[]): Record<string, number> {
  return questions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = fs.readFileSync(FILE_PATH, "utf-8");
const data: QuestionFile = JSON.parse(raw);

console.log(`\n📂 Fichier : ${FILE_PATH}`);
console.log(`📊 Questions initiales : ${data.questions.length}`);
console.log(`   Répartition : ${JSON.stringify(countByDifficulty(data.questions))}\n`);

const { unique, removed } = dedup(data.questions);

console.log(`✅ Questions uniques conservées : ${unique.length}`);
console.log(`🗑️  Questions supprimées : ${data.questions.length - unique.length}`);
console.log(`⚠️  Conflits de réponse résolus : ${removed.length}`);
console.log(`   Répartition finale : ${JSON.stringify(countByDifficulty(unique))}\n`);

if (removed.length > 0) {
  console.log("── Détail des doublons supprimés ──────────────────────────────");
  for (const { kept, discarded } of removed) {
    console.log(`\n🔵 Conservé  [${kept.id}] (${kept.difficulty})`);
    console.log(`   "${kept.question}"`);
    console.log(`   → Bonne réponse : ${kept.answer} = "${kept.options[kept.answer]}"`);
    for (const d of discarded) {
      console.log(`\n   🔴 Supprimé [${d.id}] (${d.difficulty})`);
      console.log(`   → Bonne réponse : ${d.answer} = "${d.options[d.answer]}"`);
      if (d.answer !== kept.answer) {
        console.log(`   ⚡ CONFLIT DE RÉPONSE (${d.answer} vs ${kept.answer})`);
      }
    }
  }
  console.log("\n──────────────────────────────────────────────────────────────");
}

// Écriture du fichier nettoyé
const output: QuestionFile = { ...data, questions: unique };
fs.writeFileSync(FILE_PATH, JSON.stringify(output, null, 2), "utf-8");

console.log(`\n💾 Fichier mis à jour : ${FILE_PATH}`);
console.log(`   ${data.questions.length} → ${unique.length} questions\n`);
