"""
filter_fle_anchor.py — FLE1 — Vérification de l'ancrage France/français (EN uniquement)
Version 2.0 — alignée sur erudia-prompt-maitre-questions-en.md

Deux problèmes détectés :

  1. ANCRAGE ABSENT
     La question ET ses options ne contiennent aucun élément rattachable
     à la France, à la langue française ou à la culture francophone.
     Détection par catégories sémantiques larges — pas une liste exhaustive.
     Une question générique sans aucun marqueur FR pourrait venir de n'importe
     quel quiz anglophone — ce n'est pas du FLE.

  2. ANCRAGE MÉCANIQUE
     Plus de 30% des questions du fichier commencent par le même préfixe
     de 2 mots (ex: "In France", "What French", "Which French").
     Le prompt maître interdit ce pattern répétitif : l'ancrage doit être
     naturel et varié (contexte situé, personnages, mise en scène).

Logique d'ancrage — 4 catégories détectées automatiquement :
  A) Mots français intégrés dans la question ou les options (pain, liberté, bonjour...)
  B) Noms propres français (Paris, Eiffel, Napoléon, Marianne, Versailles...)
  C) Institutions/concepts français (mairie, sénat, baccalauréat, lycée...)
  D) Références explicites France/French dans la question ou les options

⚠️  Ce filtre s'applique uniquement aux fichiers lang=en.

Usage :
  python3 filter_fle_anchor.py <fichier.json>
  python3 filter_fle_anchor.py <dossier/>

Retourne :
  exit 0 si ancrage conforme
  exit 1 si problèmes détectés
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

# ──────────────────────────────────────────────
# Détection d'ancrage — 4 catégories sémantiques
# ──────────────────────────────────────────────
# Approche : patterns larges par famille, pas liste exhaustive
# Chaque pattern couvre une famille entière de termes

ANCHOR_PATTERNS = [
    # A) Références directes France/French/Français
    r"\bfrance\b",
    r"\bfrench\b",
    r"\bfrançais[e]?\b",
    r"\bfrancophone\b",
    # B) Mots français intégrés (indique contexte FLE — l'enfant voit du FR)
    # Pattern : mot de 3+ lettres en français fréquent en FLE
    r"\b(?:bonjour|merci|bonsoir|au revoir|liberté|égalité|fraternité|"
    r"pain|beurre|fromage|croissant|baguette|café|"
    r"château|chèvre|rouge|blanc|bleu|"
    r"lycée|collège|école|maternelle|baccalauréat|"
    r"délégué|mairie|préfet|sénat|député|"
    r"monsieur|madame|mademoiselle|"
    r"voilà|c'est|je suis|tu es|il y a|"
    r"vive|vive la|"
    r"rue|avenue|boulevard|place)\b",
    # C) Noms propres français majeurs
    # Pattern : noms de lieux, personnages, monuments FR emblématiques
    r"\b(?:paris|lyon|marseille|bordeaux|toulouse|nice|strasbourg|nantes|"
    r"versailles|normandie|bretagne|alsace|provence|"
    r"eiffel|louvre|notre[- ]dame|sacré[- ]cœur|panthéon|"
    r"napoléon|de gaulle|charlemagne|clovis|"
    r"jeanne d[''']arc|marie curie|louis xiv|"
    r"marianne|marseillaise|"
    r"seine|loire|rhône|garonne)\b",
    # D) Institutions et concepts culturels français
    r"\b(?:republic|république|"
    r"élysée|elysee|"
    r"assemblée nationale|national assembly|"
    r"tour de france|"
    r"14 juillet|bastille|"
    r"brevet|bac|grandes écoles|"
    r"sncf|ratp|"
    r"franc[s]?\b)",  # l'ancien franc français
]

ANCHOR_RE = re.compile("|".join(ANCHOR_PATTERNS), re.IGNORECASE | re.UNICODE)

# Préfixe mécanique — 2 premiers mots, seuil 30%
MECHANICAL_PREFIX_WORDS = 2
MECHANICAL_THRESHOLD = 0.30

# Préfixes connus problématiques (pour rapport lisible)
KNOWN_MECHANICAL_PREFIXES = {
    "in france",
    "what french",
    "which french",
    "the french",
    "name the",
    "who is",
    "what is",
}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def load_data(path: Path) -> tuple[list[dict], str]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    questions = data if isinstance(data, list) else data.get("questions", [])
    lang = data.get("lang", "") if isinstance(data, dict) else ""
    return questions, lang


def has_anchor(q: dict) -> bool:
    """
    Vérifie si la question ou ses options contiennent un ancrage FR.
    Analyse question + toutes les options — une option FR suffit (ex: "liberté, égalité...")
    """
    parts = [q.get("question", "")]
    parts.extend(str(v) for v in q.get("options", {}).values())
    full_text = " ".join(parts)
    return bool(ANCHOR_RE.search(full_text))


def get_prefix(text: str, n: int = MECHANICAL_PREFIX_WORDS) -> str:
    """Extrait les n premiers mots en lowercase sans ponctuation."""
    words = text.strip().split()[:n]
    return " ".join(w.lower().rstrip(".,?!:") for w in words)


def find_mechanical_prefixes(questions: list[dict]) -> list[dict]:
    """Détecte les préfixes de 2 mots sur-utilisés (> seuil)."""
    total = len(questions)
    if total == 0:
        return []

    counts = Counter(
        get_prefix(q.get("question", ""))
        for q in questions
        if q.get("question", "").strip()
    )

    return [
        {"prefix": prefix, "count": count, "pct": round(count / total * 100, 1)}
        for prefix, count in counts.most_common()
        if count / total >= MECHANICAL_THRESHOLD
    ]


def find_consecutive_prefix_runs(questions: list[dict], limit: int = 3) -> list[dict]:
    """
    Détecte les séquences de questions consécutives avec le même préfixe de 2 mots.
    Le prompt interdit plus de 3 questions consécutives avec le même préfixe.
    """
    issues = []
    prefixes = [get_prefix(q.get("question", "")) for q in questions]

    i = 0
    while i < len(prefixes):
        j = i
        while j < len(prefixes) and prefixes[j] == prefixes[i]:
            j += 1
        length = j - i
        if length > limit:
            issues.append(
                {
                    "prefix": prefixes[i],
                    "length": length,
                    "start_id": questions[i].get("id", f"index_{i}"),
                    "end_id": questions[j - 1].get("id", f"index_{j - 1}"),
                }
            )
        i = j

    return issues


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────


def print_report(
    path: Path,
    lang: str,
    total: int,
    no_anchor: list[dict],
    mechanical: list[dict],
    consecutive: list[dict],
):

    print(f"\n{'═' * 60}")
    print(f"  FLE1 — Ancrage France/français : {path.name}")
    print(f"{'═' * 60}")

    if lang != "en":
        print(
            f"  ⏭️  Ignoré — lang='{lang}' (FLE1 s'applique uniquement aux fichiers EN)"
        )
        return

    print(f"  Questions analysées : {total}\n")

    # Ancrage absent
    if no_anchor:
        print(f"  ❌ ANCRAGE ABSENT — {len(no_anchor)} question(s) sans contexte FR\n")
        for q in no_anchor[:10]:
            print(f"     [{q['id']}] {q['question'][:80]}")
        if len(no_anchor) > 10:
            print(f"     … et {len(no_anchor) - 10} autre(s)")
        print(
            f"\n     → Ces questions pourraient venir de n'importe quel quiz anglophone."
        )
        print(
            f"       Ajouter un contexte France/français dans la question ou les options."
        )
        print()
    else:
        print(f"  ✅ Ancrage FR présent sur toutes les questions")

    # Préfixe mécanique global
    if mechanical:
        print(
            f"  ❌ ANCRAGE MÉCANIQUE — préfixe répété sur > {int(MECHANICAL_THRESHOLD * 100)}% du fichier\n"
        )
        for m in mechanical:
            flag = (
                " ⚠️  (préfixe connu problématique)"
                if m["prefix"] in KNOWN_MECHANICAL_PREFIXES
                else ""
            )
            print(
                f'     "{m["prefix"]}..."  →  {m["count"]} questions ({m["pct"]}%){flag}'
            )
        print(
            f"\n     → Varier : contexte situé, personnages (Lucas, Emma), mise en scène."
        )
        print()
    else:
        print(
            f"  ✅ Aucun préfixe mécanique dominant (< {int(MECHANICAL_THRESHOLD * 100)}%)"
        )

    # Séquences consécutives
    if consecutive:
        print(f"  ❌ SÉQUENCES CONSÉCUTIVES > 3 — même préfixe répété en bloc\n")
        for c in consecutive:
            print(
                f'     "{c["prefix"]}..."  ×{c["length"]}  '
                f"[{c['start_id']} → {c['end_id']}]"
            )
        print()
    else:
        print(f"  ✅ Aucune séquence consécutive > 3 avec le même préfixe")

    if not no_anchor and not mechanical and not consecutive:
        print(f"\n  ✅ Ancrage FLE conforme")


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path) -> dict:
    try:
        questions, lang = load_data(path)
    except Exception as e:
        return {
            "filter": "FLE1",
            "name": "Ancrage France/français",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {},
        }

    if lang != "en":
        return {
            "filter": "FLE1",
            "name": "Ancrage France/français",
            "file": str(path),
            "total_questions": len(questions),
            "error_count": 0,
            "passed": True,
            "summary": f"Ignoré (lang={lang})",
            "details": {"skipped": True, "lang": lang},
        }

    total = len(questions)
    no_anchor = [
        {"id": q.get("id"), "question": q.get("question", "")[:100]}
        for q in questions
        if not has_anchor(q)
    ]
    mechanical = find_mechanical_prefixes(questions)
    consecutive = find_consecutive_prefix_runs(questions)

    errors = []
    if no_anchor:
        errors.append(f"{len(no_anchor)} question(s) sans ancrage FR")
    for m in mechanical:
        errors.append(f'Préfixe mécanique "{m["prefix"]}" : {m["pct"]}%')
    for c in consecutive:
        errors.append(f'Séquence consécutive "{c["prefix"]}" × {c["length"]}')

    return {
        "filter": "FLE1",
        "name": "Ancrage France/français",
        "file": str(path),
        "total_questions": total,
        "error_count": len(errors),
        "passed": len(errors) == 0,
        "summary": "Ancrage FLE conforme" if not errors else " | ".join(errors),
        "details": {
            "lang": lang,
            "no_anchor": no_anchor,
            "mechanical_prefixes": mechanical,
            "consecutive_runs": consecutive,
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter_fle_anchor.py <fichier.json|dossier/>")
        sys.exit(1)

    target = Path(sys.argv[1])
    has_errors = False

    files = (
        sorted(target.rglob("*.json"))
        if target.is_dir()
        else [target]
        if target.is_file()
        else []
    )

    if not files:
        print(f"Chemin introuvable ou aucun JSON : {target}")
        sys.exit(1)

    for path in files:
        result = run(path)
        d = result["details"]

        if d.get("skipped"):
            print(f"\n  FLE1 — {path.name} : ⏭️  ignoré (lang={d.get('lang')})")
            continue

        try:
            questions, _ = load_data(path)
        except Exception:
            questions = []

        print_report(
            path,
            d.get("lang", ""),
            result["total_questions"],
            d.get("no_anchor", []),
            d.get("mechanical_prefixes", []),
            d.get("consecutive_runs", []),
        )

        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit FLE1 terminé — problèmes d'ancrage détectés")
        sys.exit(1)
    else:
        print("  ✅ Audit FLE1 terminé — ancrage conforme")
        sys.exit(0)


if __name__ == "__main__":
    main()
