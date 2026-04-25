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

const FILES = [
  // ── Gratuites ──────────────────────────────────────────────────────────────
  { path: 'src/data/questions/fr/sciences.json',          category: 'sciences',         locale: 'fr' },
  { path: 'src/data/questions/fr/histoire.json',          category: 'histoire',         locale: 'fr' },
  { path: 'src/data/questions/fr/heroes.json',            category: 'heroes',           locale: 'fr' },
  { path: 'src/data/questions/fr/animaux-nature.json',    category: 'animaux-nature',   locale: 'fr' },
  { path: 'src/data/questions/en/sciences.json',          category: 'sciences',         locale: 'en' },
  { path: 'src/data/questions/en/histoire.json',          category: 'histoire',         locale: 'en' },
  { path: 'src/data/questions/en/heroes.json',            category: 'heroes',           locale: 'en' },

  // ── Premium FR ─────────────────────────────────────────────────────────────
  { path: 'src/data/questions/fr/math.json',              category: 'math',             locale: 'fr' },
  { path: 'src/data/questions/fr/francais.json',          category: 'francais',         locale: 'fr' },
  { path: 'src/data/questions/fr/sport.json',             category: 'sport',            locale: 'fr' },
  { path: 'src/data/questions/fr/geographie.json',        category: 'geographie',       locale: 'fr' },
  { path: 'src/data/questions/fr/anglais.json',           category: 'anglais',          locale: 'fr' },
  { path: 'src/data/questions/fr/art.json',               category: 'art',              locale: 'fr' },
  { path: 'src/data/questions/fr/corps-humain.json',      category: 'corps-humain',     locale: 'fr' },
  { path: 'src/data/questions/fr/cuisine.json',              category: 'cuisine',       locale: 'fr' },
  { path: 'src/data/questions/fr/dinosaures.json',        category: 'dinosaures',       locale: 'fr' },
  { path: 'src/data/questions/fr/education-civique.json', category: 'education-civique',locale: 'fr' },
  { path: 'src/data/questions/fr/environnement.json',     category: 'environnement',    locale: 'fr' },
  { path: 'src/data/questions/fr/espace-astronomie.json', category: 'espace-astronomie',locale: 'fr' },
  { path: 'src/data/questions/fr/monde-antique.json',     category: 'monde-antique',    locale: 'fr' },
  { path: 'src/data/questions/fr/musique.json',           category: 'musique',          locale: 'fr' },
  { path: 'src/data/questions/fr/technologie.json',       category: 'technologie',      locale: 'fr' },

  // ── Premium EN ─────────────────────────────────────────────────────────────
  { path: 'src/data/questions/en/math.json',              category: 'math',             locale: 'en' },
  { path: 'src/data/questions/en/francais.json',          category: 'francais',         locale: 'en' },
  { path: 'src/data/questions/en/sport.json',             category: 'sport',            locale: 'en' },
  { path: 'src/data/questions/en/corps-humain.json',      category: 'corps-humain',     locale: 'en' },
  { path: 'src/data/questions/en/education-civique.json', category: 'education-civique',locale: 'en' },
  { path: 'src/data/questions/en/animaux-nature.json',    category: 'animaux-nature',   locale: 'en' },
  { path: 'src/data/questions/en/anglais.json',           category: 'anglais',          locale: 'en' },
  { path: 'src/data/questions/en/art.json',               category: 'art',              locale: 'en' },
  { path: 'src/data/questions/en/cuisine.json',           category: 'cuisine',          locale: 'en' },
  { path: 'src/data/questions/en/dinosaures.json',        category: 'dinosaures',       locale: 'en' },
  { path: 'src/data/questions/en/monde-antique.json',     category: 'monde-antique',    locale: 'en' },
  { path: 'src/data/questions/en/geographie.json',        category: 'geographie',        locale: 'en' },
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
