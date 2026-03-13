/**
 * scripts/cleanup-old-questions.ts
 *
 * Supprime les anciennes questions histoire de Supabase.
 * Anciens IDs (3 chiffres) : hist-fr-001..099, hist-en-001..099
 * Aussi : hist-gen-XXX (IDs temporaires sans locale)
 * Nouveaux IDs (4 chiffres) : hist-fr-0001..0500, hist-en-0001..0500
 *
 * Usage : npx tsx scripts/cleanup-old-questions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  console.log('🧹 Nettoyage des anciennes questions histoire...\n');

  // Anciens IDs 3 chiffres + hist-gen sans locale
  const oldIds: string[] = [];
  for (let i = 1; i <= 99; i++) {
    const n = String(i).padStart(3, '0');
    oldIds.push(`hist-fr-${n}`);
    oldIds.push(`hist-en-${n}`);
  }
  for (let i = 1; i <= 500; i++) {
    const n = String(i).padStart(3, '0');
    oldIds.push(`hist-gen-${n}`);
  }

  // Vérifier lesquels existent réellement
  const { data: existing, error: fetchErr } = await supabase
    .from('questions')
    .select('id')
    .in('id', oldIds);

  if (fetchErr) {
    console.error('❌ Erreur fetch:', fetchErr.message);
    process.exit(1);
  }

  const existingIds = (existing || []).map((r: { id: string }) => r.id);
  console.log(`IDs trouvés en DB : ${existingIds.length}`);
  if (existingIds.length > 0) {
    console.log('  Exemples:', existingIds.slice(0, 5));
  }

  if (existingIds.length === 0) {
    console.log('\n✅ Aucune ancienne entrée trouvée — DB déjà propre.');
    return;
  }

  // Supprimer par batch de 100
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < existingIds.length; i += BATCH) {
    const batch = existingIds.slice(i, i + BATCH);
    const { error } = await supabase
      .from('questions')
      .delete()
      .in('id', batch);
    if (error) {
      console.error('❌ Erreur suppression:', error.message);
      process.exit(1);
    }
    deleted += batch.length;
  }

  console.log(`\n✅ ${deleted} anciennes questions supprimées.`);
}

cleanup();
