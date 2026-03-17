/**
 * src/components/features/admin/ReportPdf.tsx
 *
 * Template PDF du rapport de progression — rendu via @react-pdf/renderer.
 *
 * ⚠️  Ce composant ne doit PAS être importé statiquement dans les pages Next.js :
 *     @react-pdf/renderer est incompatible SSR. Utiliser un dynamic import depuis
 *     un handler de clic (voir ReportSection.tsx).
 *
 * Design : sobre, aligné avec le design system Erudia (#667eea).
 * Pas de dépendance next-intl — les libellés sont embarqués directement
 * pour garantir le rendu hors contexte React.
 *
 * Sections :
 *   1. Header (nom, pseudo, date de génération, compteur badges)
 *   2. Stats globales (parties, points, meilleur score)
 *   3. Défi quotidien (streak, XP, titre)
 *   4. Badges gagnés (liste texte + emoji)
 *   5. Stats par catégorie (tableau)
 *   6. 10 dernières parties (tableau)
 *   7. Footer fixe
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ReportData } from '@/lib/report';

// ─── Design tokens (alignés sur le design system SCSS) ────────────────────────

const C = {
  primary:     '#667eea',
  primaryDark: '#764ba2',
  white:       '#ffffff',
  bg:          '#f8f7ff',
  bgCard:      '#f3f4f6',
  foreground:  '#1a1a2e',
  muted:       '#6b7280',
  border:      '#e5e7eb',
  success:     '#10B981',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    backgroundColor: C.bg,
    paddingBottom:   48,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingTop:        24,
    paddingBottom:     20,
  },
  headerTitle: {
    fontFamily:  'Helvetica-Bold',
    fontSize:    20,
    color:       C.white,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 11,
    color:    'rgba(255,255,255,0.85)',
  },
  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    marginTop:       14,
  },
  headerPill: {
    backgroundColor:  'rgba(255,255,255,0.2)',
    borderRadius:     99,
    paddingHorizontal: 10,
    paddingVertical:   4,
    fontSize:         9,
    color:            C.white,
    fontFamily:       'Helvetica-Bold',
  },

  // ── Corps ──────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 24,
    paddingTop:        18,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  section: {
    backgroundColor:   C.white,
    borderRadius:      8,
    padding:           16,
    marginBottom:      12,
    // Bordure gauche simulée (react-pdf ne gère pas border-left shorthand)
    borderLeftWidth:   3,
    borderLeftColor:   C.primary,
    borderLeftStyle:   'solid',
  },
  sectionTitle: {
    fontFamily:    'Helvetica-Bold',
    fontSize:      9,
    color:         C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  10,
  },

  // ── Stats grid (3 colonnes) ─────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
  },
  statCard: {
    flex:            1,
    backgroundColor: C.bgCard,
    borderRadius:    6,
    padding:         10,
    alignItems:      'center',
    marginRight:     8,
  },
  statCardLast: {
    flex:            1,
    backgroundColor: C.bgCard,
    borderRadius:    6,
    padding:         10,
    alignItems:      'center',
  },
  statValue: {
    fontFamily:   'Helvetica-Bold',
    fontSize:     20,
    color:        C.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize:      8,
    color:         C.muted,
    textAlign:     'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Daily (3 colonnes) ─────────────────────────────────────────────────────
  dailyRow: {
    flexDirection: 'row',
  },
  dailyCard: {
    flex:            1,
    backgroundColor: C.bgCard,
    borderRadius:    6,
    padding:         10,
    alignItems:      'center',
    marginRight:     8,
  },
  dailyCardLast: {
    flex:            1,
    backgroundColor: C.bgCard,
    borderRadius:    6,
    padding:         10,
    alignItems:      'center',
  },
  dailyValue: {
    fontFamily:   'Helvetica-Bold',
    fontSize:     16,
    color:        C.primary,
    marginBottom: 2,
  },
  dailyLabel: {
    fontSize:      8,
    color:         C.muted,
    textAlign:     'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Badges ─────────────────────────────────────────────────────────────────
  badgesWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
  },
  badgeChip: {
    backgroundColor:  C.bgCard,
    borderRadius:     4,
    paddingHorizontal: 8,
    paddingVertical:   5,
    marginRight:       6,
    marginBottom:      6,
  },
  badgeText: {
    fontSize: 9,
    color:    C.foreground,
  },
  emptyText: {
    fontSize: 10,
    color:    C.muted,
    fontStyle: 'italic',
  },

  // ── Tableau générique ───────────────────────────────────────────────────────
  tableHead: {
    flexDirection:   'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom:   5,
    marginBottom:    3,
  },
  tableRow: {
    flexDirection:   'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  th: {
    fontFamily:    'Helvetica-Bold',
    fontSize:      8,
    color:         C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 9,
    color:    C.foreground,
  },
  // Largeurs colonnes catégories
  cCol1: { width: '40%' },
  cCol2: { width: '20%' },
  cCol3: { width: '20%' },
  cCol4: { width: '20%' },
  // Largeurs colonnes sessions
  sCol1: { width: '28%' },
  sCol2: { width: '22%' },
  sCol3: { width: '22%' },
  sCol4: { width: '28%' },

  // ── Footer fixe ────────────────────────────────────────────────────────────
  footer: {
    position:          'absolute',
    bottom:            14,
    left:              24,
    right:             24,
    flexDirection:     'row',
    justifyContent:    'space-between',
    borderTopWidth:    1,
    borderTopColor:    C.border,
    paddingTop:        6,
  },
  footerText: {
    fontSize: 8,
    color:    C.muted,
  },
});

// ─── Libellés bilingues ────────────────────────────────────────────────────────

type LabelKey =
  | 'title' | 'generatedOn'
  | 'statsTitle' | 'totalGames' | 'totalPoints' | 'bestScore'
  | 'dailyTitle' | 'streak' | 'xp' | 'titleLabel'
  | 'badgesTitle' | 'noBadges'
  | 'categoryTitle' | 'sciences' | 'histoire' | 'heroes'
  | 'games' | 'best' | 'avg'
  | 'sessionsTitle' | 'date' | 'category' | 'difficulty' | 'score'
  | 'easy' | 'medium' | 'hard'
  | 'noGames'
  | 'footerApp' | 'footerNote';

const LABELS: Record<'fr' | 'en', Record<LabelKey, string>> = {
  fr: {
    title:          'Rapport de progression',
    generatedOn:    'Genere le',
    statsTitle:     'Statistiques globales',
    totalGames:     'Parties jouees',
    totalPoints:    'Points',
    bestScore:      'Meilleur score',
    dailyTitle:     'Defi quotidien',
    streak:         'Jours consecutifs',
    xp:             'XP total',
    titleLabel:     'Titre',
    badgesTitle:    'Badges obtenus',
    noBadges:       'Aucun badge pour l\'instant',
    categoryTitle:  'Par categorie',
    sciences:       'Sciences',
    histoire:       'Histoire',
    heroes:         'Heros',
    games:          'Parties',
    best:           'Meilleur',
    avg:            'Moyenne',
    sessionsTitle:  '10 dernieres parties',
    date:           'Date',
    category:       'Categorie',
    difficulty:     'Difficulte',
    score:          'Score',
    easy:           'Facile',
    medium:         'Moyen',
    hard:           'Difficile',
    noGames:        'Aucune partie',
    footerApp:      'Erudia — Application educative',
    footerNote:     'Rapport confidentiel — Parents et enseignants',
  },
  en: {
    title:          'Progress Report',
    generatedOn:    'Generated on',
    statsTitle:     'Overall statistics',
    totalGames:     'Games played',
    totalPoints:    'Points',
    bestScore:      'Best score',
    dailyTitle:     'Daily challenge',
    streak:         'Days in a row',
    xp:             'Total XP',
    titleLabel:     'Title',
    badgesTitle:    'Badges earned',
    noBadges:       'No badges yet',
    categoryTitle:  'By category',
    sciences:       'Science',
    histoire:       'History',
    heroes:         'Heroes',
    games:          'Games',
    best:           'Best',
    avg:            'Average',
    sessionsTitle:  'Last 10 games',
    date:           'Date',
    category:       'Category',
    difficulty:     'Difficulty',
    score:          'Score',
    easy:           'Easy',
    medium:         'Medium',
    hard:           'Hard',
    noGames:        'No games yet',
    footerApp:      'Erudia — Educational app',
    footerNote:     'Confidential report — For parents and teachers',
  },
};

// Maps catégorie/difficulté → clé de libellé
const CAT_LABEL: Record<string, LabelKey>  = { sciences: 'sciences', histoire: 'histoire', heroes: 'heroes' };
const DIFF_LABEL: Record<string, LabelKey> = { easy: 'easy', medium: 'medium', hard: 'hard' };

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso.split('T')[0];
  }
}

// ─── Composant principal ───────────────────────────────────────────────────────

interface ReportPdfProps {
  data: ReportData;
}

export function ReportPdf({ data }: ReportPdfProps) {
  // Libellés selon la locale de l'enfant
  const L = LABELS[data.locale as 'fr' | 'en'] ?? LABELS.fr;

  return (
    <Document
      title={`${L.title} — ${data.pseudo}`}
      author="Erudia"
      subject={L.title}
    >
      <Page size="A4" style={s.page}>

        {/* ── 1. Header ───────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Erudia — {L.title}</Text>
          <Text style={s.headerSub}>{data.pseudo}</Text>
          <View style={s.headerRow}>
            <Text style={s.headerPill}>
              {L.generatedOn} {formatDate(data.generatedAt, data.locale)}
            </Text>
            <Text style={s.headerPill}>
              {data.earnedBadges.length} / {data.totalBadgeCount} badges
            </Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── 2. Stats globales ─────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.statsTitle}</Text>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{data.totalGames}</Text>
                <Text style={s.statLabel}>{L.totalGames}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{data.totalPoints}</Text>
                <Text style={s.statLabel}>{L.totalPoints}</Text>
              </View>
              <View style={s.statCardLast}>
                <Text style={s.statValue}>
                  {data.bestScorePct !== null ? `${data.bestScorePct}%` : '\u2014'}
                </Text>
                <Text style={s.statLabel}>{L.bestScore}</Text>
              </View>
            </View>
          </View>

          {/* ── 3. Défi quotidien ─────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.dailyTitle}</Text>
            <View style={s.dailyRow}>
              <View style={s.dailyCard}>
                <Text style={s.dailyValue}>{data.dailyStreak}</Text>
                <Text style={s.dailyLabel}>{L.streak}</Text>
              </View>
              <View style={s.dailyCard}>
                <Text style={s.dailyValue}>{data.dailyXp}</Text>
                <Text style={s.dailyLabel}>{L.xp}</Text>
              </View>
              <View style={s.dailyCardLast}>
                {/* Emoji converti en texte car Helvetica ne supporte pas les emojis couleur */}
                <Text style={s.dailyValue}>{data.dailyTitleKey.toUpperCase()}</Text>
                <Text style={s.dailyLabel}>{L.titleLabel}</Text>
              </View>
            </View>
          </View>

          {/* ── 4. Badges gagnés ──────────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.badgesTitle}</Text>
            {data.earnedBadges.length === 0 ? (
              <Text style={s.emptyText}>{L.noBadges}</Text>
            ) : (
              <View style={s.badgesWrap}>
                {data.earnedBadges.map((b) => (
                  <View key={b.id} style={s.badgeChip}>
                    {/* Nom du badge dans la locale de l'enfant, sans emoji (limites Helvetica) */}
                    <Text style={s.badgeText}>
                      {data.locale === 'en' ? b.name_en : b.name_fr}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 5. Stats par catégorie ────────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.categoryTitle}</Text>
            <View style={s.tableHead}>
              <Text style={[s.th, s.cCol1]}>{L.category}</Text>
              <Text style={[s.th, s.cCol2]}>{L.games}</Text>
              <Text style={[s.th, s.cCol3]}>{L.best}</Text>
              <Text style={[s.th, s.cCol4]}>{L.avg}</Text>
            </View>
            {(['sciences', 'histoire', 'heroes'] as const).map((cat) => {
              const cs = data.categoryStats[cat];
              return (
                <View key={cat} style={s.tableRow}>
                  <Text style={[s.td, s.cCol1]}>{L[CAT_LABEL[cat]]}</Text>
                  <Text style={[s.td, s.cCol2]}>{cs.games}</Text>
                  <Text style={[s.td, s.cCol3]}>{cs.bestPct !== null ? `${cs.bestPct}%` : '\u2014'}</Text>
                  <Text style={[s.td, s.cCol4]}>{cs.avgPct !== null ? `${cs.avgPct}%` : '\u2014'}</Text>
                </View>
              );
            })}
          </View>

          {/* ── 6. 10 dernières parties ───────────────────────────────────── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{L.sessionsTitle}</Text>
            {data.recentSessions.length === 0 ? (
              <Text style={s.emptyText}>{L.noGames}</Text>
            ) : (
              <>
                <View style={s.tableHead}>
                  <Text style={[s.th, s.sCol1]}>{L.date}</Text>
                  <Text style={[s.th, s.sCol2]}>{L.category}</Text>
                  <Text style={[s.th, s.sCol3]}>{L.difficulty}</Text>
                  <Text style={[s.th, s.sCol4]}>{L.score}</Text>
                </View>
                {data.recentSessions.map((sess, i) => (
                  <View key={i} style={s.tableRow}>
                    <Text style={[s.td, s.sCol1]}>{formatDate(sess.playedAt, data.locale)}</Text>
                    <Text style={[s.td, s.sCol2]}>{L[CAT_LABEL[sess.category]]}</Text>
                    <Text style={[s.td, s.sCol3]}>{L[DIFF_LABEL[sess.difficulty]]}</Text>
                    <Text style={[s.td, s.sCol4]}>{sess.score} / {sess.totalQuestions}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

        </View>

        {/* ── 7. Footer fixe ────────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{L.footerApp}</Text>
          <Text style={s.footerText}>{L.footerNote}</Text>
        </View>

      </Page>
    </Document>
  );
}
