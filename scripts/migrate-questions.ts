/**
 * scripts/migrate-questions.ts
 *
 * Migration one-shot : importe tous les fichiers JSON de questions
 * dans la table Supabase `questions`.
 *
 * Gère deux formats de fichier source :
 *   - Format A (options A/B/C/D) : { options: { A, B, C, D }, answer: "A" }
 *   - Format B (choices array)   : { choices: [...], answer: "valeur exacte" }
 *
 * Utilise la SERVICE ROLE KEY (pas l'anon key) pour bypasser RLS.
 *
 * Usage :
 *   npx tsx scripts/migrate-questions.ts
 *
 * Variables d'environnement requises (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← Supabase > Settings > API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ─── Fichiers à migrer ────────────────────────────────────────────────────────

// Les 5 catégories officielles v1.4 (cahier-des-charges-claude-v1.4.md §2),
// 200 questions par langue chacune — voir scripts/questions/prompt_generation.md
// pour le pipeline de génération (Gemini + scripts de contrôle qualité).
const FILES = [
  { path: 'src/data/questions/fr/histoire-du-monde.json', category: 'histoire-du-monde', locale: 'fr' },
  { path: 'src/data/questions/en/histoire-du-monde.json', category: 'histoire-du-monde', locale: 'en' },
  { path: 'src/data/questions/fr/culture-generale.json',  category: 'culture-generale',  locale: 'fr' },
  { path: 'src/data/questions/en/culture-generale.json',  category: 'culture-generale',  locale: 'en' },
  { path: 'src/data/questions/fr/sciences-nature.json',   category: 'sciences-nature',   locale: 'fr' },
  { path: 'src/data/questions/en/sciences-nature.json',   category: 'sciences-nature',   locale: 'en' },
  { path: 'src/data/questions/fr/dinosaures.json',        category: 'dinosaures',        locale: 'fr' },
  { path: 'src/data/questions/en/dinosaures.json',        category: 'dinosaures',        locale: 'en' },
  { path: 'src/data/questions/fr/espace.json',            category: 'espace',            locale: 'fr' },
  { path: 'src/data/questions/en/espace.json',            category: 'espace',            locale: 'en' },
] as const;

// ─── Types source ─────────────────────────────────────────────────────────────

// Format A : options objet { A, B, C, D } + answer lettre
interface QuestionFormatA {
  id: string;
  difficulty: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string; // "A" | "B" | "C" | "D"
}

// Format B : choices tableau + answer valeur exacte
interface QuestionFormatB {
  id: string;
  difficulty: string;
  question: string;
  choices: string[];
  answer: string; // valeur exacte correspondant à une entrée de choices
}

type AnyQuestion = QuestionFormatA | QuestionFormatB;

interface WrappedFile {
  questions: AnyQuestion[];
}

// ─── Type DB ──────────────────────────────────────────────────────────────────

interface DbRow {
  id:         string;
  category:   string;
  locale:     string;
  difficulty: string;
  question:   string;
  option_a:   string;
  option_b:   string;
  option_c:   string;
  option_d:   string;
  answer:     string; // toujours "A" | "B" | "C" | "D" en DB
}

// ─── Conversion ───────────────────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'] as const;

function toDbRow(q: AnyQuestion, category: string, locale: string): DbRow {
  if ('options' in q) {
    // Format A — options objet, answer déjà en lettre
    return {
      id:         q.id,
      category,
      locale,
      difficulty: q.difficulty,
      question:   q.question,
      option_a:   q.options.A,
      option_b:   q.options.B,
      option_c:   q.options.C,
      option_d:   q.options.D,
      answer:     q.answer,
    };
  } else {
    // Format B — choices tableau, answer est la valeur exacte
    const idx = q.choices.findIndex(
      (c) => String(c).trim() === String(q.answer).trim()
    );
    if (idx === -1 || idx > 3) {
      // Fallback : on prend le premier choix et on log un warning
      console.warn(`    ⚠️  ${q.id} — answer "${q.answer}" introuvable dans choices, fallback A`);
    }
    return {
      id:         q.id,
      category,
      locale,
      difficulty: q.difficulty,
      question:   q.question,
      option_a:   String(q.choices[0] ?? ''),
      option_b:   String(q.choices[1] ?? ''),
      option_c:   String(q.choices[2] ?? ''),
      option_d:   String(q.choices[3] ?? ''),
      answer:     idx >= 0 && idx <= 3 ? LETTERS[idx] : 'A',
    };
  }
}

// ─── Migration ────────────────────────────────────────────────────────────────

async function migrateFile(filePath: string, category: string, locale: string): Promise<number> {
  const absPath = join(process.cwd(), filePath);
  const raw = JSON.parse(readFileSync(absPath, 'utf-8')) as AnyQuestion[] | WrappedFile;
  const questions: AnyQuestion[] = Array.isArray(raw) ? raw : raw.questions;

  const rows: DbRow[] = questions.map((q) => toDbRow(q, category, locale));

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('questions')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Erreur batch ${Math.floor(i / BATCH) + 1} : ${error.message}`);
      throw error;
    }
  }

  return rows.length;
}

async function main() {
  console.log('🚀 Migration questions JSON → Supabase\n');

  let total = 0;
  for (const file of FILES) {
    process.stdout.write(`📂 ${file.category}/${file.locale} (${file.path}) ... `);
    try {
      const count = await migrateFile(file.path, file.category, file.locale);
      total += count;
      console.log(`✅ ${count} questions`);
    } catch (err) {
      console.error(`\n❌ Échec sur ${file.path}`, err);
      process.exit(1);
    }
  }

  console.log(`\n✅ Migration terminée — ${total} questions au total`);
}

main();
