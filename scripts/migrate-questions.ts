/**
 * scripts/migrate-questions.ts
 *
 * Migration one-shot : importe tous les fichiers JSON de questions
 * dans la table Supabase `questions`.
 *
 * Utilise la SERVICE ROLE KEY (pas l'anon key) pour bypasser RLS.
 *
 * Usage :
 *   npx tsx scripts/migrate-questions.ts
 *
 * Variables d'environnement requises (.env.local) :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← récupérer dans Supabase > Settings > API
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

// Charger .env.local manuellement (tsx ne le fait pas automatiquement)
import { config } from 'dotenv';
config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

// Client avec service role — bypass RLS pour l'insertion
const supabase = createClient(supabaseUrl, serviceRoleKey);

// ─── Fichiers à migrer ────────────────────────────────────────────────────────

const FILES = [
  { path: 'src/data/questions/fr/sciences.json', category: 'sciences', locale: 'fr' },
  { path: 'src/data/questions/fr/histoire.json', category: 'histoire', locale: 'fr' },
  { path: 'src/data/questions/fr/heroes.json',   category: 'heroes',   locale: 'fr' },
  { path: 'src/data/questions/en/sciences.json', category: 'sciences', locale: 'en' },
  { path: 'src/data/questions/en/histoire.json', category: 'histoire', locale: 'en' },
  { path: 'src/data/questions/en/heroes.json',   category: 'heroes',   locale: 'en' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface JsonQuestion {
  id: string;
  difficulty: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
}

interface JsonFile {
  questions: JsonQuestion[];
}

interface DbRow {
  id: string;
  category: string;
  locale: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
}

// ─── Migration ────────────────────────────────────────────────────────────────

async function migrateFile(filePath: string, category: string, locale: string): Promise<void> {
  const absPath = join(process.cwd(), filePath);
  const file: JsonFile = JSON.parse(readFileSync(absPath, 'utf-8'));

  const rows: DbRow[] = file.questions.map((q) => ({
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
  }));

  // Upsert par batch de 100 — évite les timeouts sur les grands fichiers
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('questions')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  ❌ Erreur batch ${i / BATCH + 1} : ${error.message}`);
      throw error;
    }
    inserted += batch.length;
  }

  console.log(`  ✅ ${category}/${locale} — ${inserted} questions insérées`);
}

async function main() {
  console.log('🚀 Migration questions JSON → Supabase\n');

  let total = 0;
  for (const file of FILES) {
    process.stdout.write(`📂 ${file.path} ... `);
    try {
      await migrateFile(file.path, file.category, file.locale);
      const count = JSON.parse(readFileSync(join(process.cwd(), file.path), 'utf-8')).questions.length;
      total += count;
    } catch (err) {
      console.error(`\n❌ Échec sur ${file.path}`, err);
      process.exit(1);
    }
  }

  console.log(`\n✅ Migration terminée — ${total} questions au total dans Supabase`);
}

main();
