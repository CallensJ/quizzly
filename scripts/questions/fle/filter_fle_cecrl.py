"""
filter_fle_cecrl_level.py — FLE2 — Cohérence CECRL et qualité des options (EN uniquement)
Version 2.0 — alignée sur erudia-prompt-maitre-questions-en.md

Mapping CECRL officiel Erudia :
  easy   → A1/A2 : ≤ 10 mots, syntaxe simple, pas de subordonnées
  medium → B1    : ≤ 20 mots, subordonnées simples autorisées
  hard   → B2    : ≤ 25 mots, syntaxe complexe, nuances

Vérifications :

  1. LONGUEUR QUESTION (en mots — pas en caractères)
     easy   : > 10 mots → flag
     medium : > 20 mots → flag
     hard   : > 25 mots → flag

  2. SUBORDONNÉES DANS EASY (A1)
     Détection de connecteurs subordonnants en début de clause :
     who/which/that/because/when/where/although/however
     Une question easy avec subordonnée = trop complexe pour A1.

  3. HOMOGÉNÉITÉ DES OPTIONS
     Écart > 3 mots entre l'option la plus courte et la plus longue.
     Signal fort de biais : l'enfant devine la bonne réponse par la longueur.

  4. PARENTHÈSES DANS LES OPTIONS
     "La mairie (city hall)" → biais visuel, la traduction trahit la bonne réponse.
     Interdit dans toutes les options, tous niveaux.

  5. OPTIONS PIÈGES INTERDITES
     "All of the above", "None of the above", "Both A and B" etc.
     Charge cognitive trop élevée pour un enfant de 6-11 ans.

⚠️  Ce filtre s'applique uniquement aux fichiers lang=en.

Usage :
  python3 filter_fle_cecrl_level.py <fichier.json>
  python3 filter_fle_cecrl_level.py <dossier/>

Retourne :
  exit 0 si aucun problème
  exit 1 si problèmes détectés
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# ──────────────────────────────────────────────
# Constantes — alignées prompt maître
# ──────────────────────────────────────────────

# Limites longueur en MOTS (sourcé : prompt maître erudia)
WORD_LIMITS = {
    "easy": 10,
    "medium": 20,
    "hard": 25,
}

# Connecteurs subordonnants interdits dans easy (A1)
# Détectés uniquement quand ils introduisent une clause (pas en option)
SUBORDINATE_CONNECTORS = re.compile(
    r"\b(?:who|which|that|because|when|where|although|however|"
    r"whose|whom|while|since|unless|until|before|after)\b",
    re.IGNORECASE,
)

# Écart max en mots entre option la plus courte et la plus longue
OPTION_HOMOGENEITY_MAX_GAP = 3

# Options pièges interdites (insensible à la casse)
TRAP_OPTIONS = re.compile(
    r"\b(?:all of the above|none of the above|all of the above|"
    r"both a and b|both b and c|all are correct|"
    r"none of these|all of these)\b",
    re.IGNORECASE,
)

OPTION_KEYS = ["A", "B", "C", "D"]


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def load_data(path: Path) -> tuple[list[dict], str]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    questions = data if isinstance(data, list) else data.get("questions", [])
    lang = data.get("lang", "") if isinstance(data, dict) else ""
    return questions, lang


def word_count(text: str) -> int:
    return len(text.strip().split())


def option_word_counts(q: dict) -> list[int]:
    opts = q.get("options", {})
    return [
        word_count(str(opts.get(k, ""))) for k in OPTION_KEYS if opts.get(k, "").strip()
    ]


def has_parentheses(text: str) -> bool:
    return "(" in text or ")" in text


def has_trap_option(text: str) -> bool:
    return bool(TRAP_OPTIONS.search(text))


def has_subordinate(text: str) -> bool:
    return bool(SUBORDINATE_CONNECTORS.search(text))


# ──────────────────────────────────────────────
# Détection
# ──────────────────────────────────────────────


def check_question(q: dict) -> list[dict]:
    """
    Analyse une question et retourne la liste des problèmes détectés.
    Chaque problème : {type, detail}
    """
    issues = []
    difficulty = q.get("difficulty", "")
    question_text = q.get("question", "")
    opts = q.get("options", {})
    qid = q.get("id", "?")

    # 1. Longueur question
    limit = WORD_LIMITS.get(difficulty)
    if limit:
        wc = word_count(question_text)
        if wc > limit:
            issues.append(
                {
                    "type": "QUESTION_TOO_LONG",
                    "detail": f"{wc} mots (max {limit} pour {difficulty})",
                }
            )

    # 2. Subordonnées dans easy
    if difficulty == "easy" and has_subordinate(question_text):
        match = SUBORDINATE_CONNECTORS.search(question_text)
        issues.append(
            {
                "type": "SUBORDINATE_IN_EASY",
                "detail": f'connecteur subordonné détecté : "{match.group()}" → syntaxe trop complexe pour A1',
            }
        )

    # 3. Parenthèses dans les options
    for key in OPTION_KEYS:
        val = str(opts.get(key, ""))
        if has_parentheses(val):
            issues.append(
                {
                    "type": "PARENTHESES_IN_OPTION",
                    "detail": f'option {key}: "{val[:60]}"',
                }
            )

    # 4. Homogénéité des options
    lengths = option_word_counts(q)
    if len(lengths) >= 2:
        gap = max(lengths) - min(lengths)
        if gap > OPTION_HOMOGENEITY_MAX_GAP:
            issues.append(
                {
                    "type": "OPTIONS_NOT_HOMOGENEOUS",
                    "detail": f"écart {gap} mots entre options (max {OPTION_HOMOGENEITY_MAX_GAP}) "
                    f"— longueurs : {lengths}",
                }
            )

    # 5. Options pièges
    for key in OPTION_KEYS:
        val = str(opts.get(key, ""))
        if has_trap_option(val):
            issues.append(
                {
                    "type": "TRAP_OPTION",
                    "detail": f'option {key}: "{val[:60]}" — interdit (charge cognitive excessive)',
                }
            )

    return issues


def analyze_questions(questions: list[dict]) -> list[dict]:
    """Analyse toutes les questions et retourne celles avec des problèmes."""
    flagged = []
    for q in questions:
        problems = check_question(q)
        if problems:
            flagged.append(
                {
                    "id": q.get("id"),
                    "difficulty": q.get("difficulty"),
                    "question": q.get("question", "")[:80],
                    "issues": problems,
                }
            )
    return flagged


def count_by_type(flagged: list[dict]) -> dict:
    """Agrège les problèmes par type pour le résumé."""
    counts = defaultdict(int)
    for q in flagged:
        for issue in q["issues"]:
            counts[issue["type"]] += 1
    return dict(counts)


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────

TYPE_LABELS = {
    "QUESTION_TOO_LONG": "Question trop longue",
    "SUBORDINATE_IN_EASY": "Subordonnée dans easy (A1)",
    "PARENTHESES_IN_OPTION": "Parenthèses dans option",
    "OPTIONS_NOT_HOMOGENEOUS": "Options non homogènes",
    "TRAP_OPTION": "Option piège interdite",
}


def print_report(path: Path, lang: str, total: int, flagged: list[dict]):

    print(f"\n{'═' * 60}")
    print(f"  FLE2 — CECRL + Qualité options : {path.name}")
    print(f"{'═' * 60}")

    if lang != "en":
        print(
            f"  ⏭️  Ignoré — lang='{lang}' (FLE2 s'applique uniquement aux fichiers EN)"
        )
        return

    print(f"  Questions analysées : {total}")
    print(f"  Mapping : easy=A1/A2 (≤10 mots) | medium=B1 (≤20) | hard=B2 (≤25)\n")

    if not flagged:
        print(f"  ✅ Aucun problème CECRL ou qualité options détecté")
        return

    # Résumé par type
    counts = count_by_type(flagged)
    print(f"  ❌ {len(flagged)} question(s) avec problème(s)\n")
    print(f"  Résumé par type :")
    for t, label in TYPE_LABELS.items():
        if t in counts:
            print(f"    {label:<35} : {counts[t]}")
    print()

    # Détail — max 15 questions
    print(f"  Détail :")
    for q in flagged[:15]:
        print(f"\n    [{q['id']}] ({q['difficulty']}) {q['question']}")
        for issue in q["issues"]:
            label = TYPE_LABELS.get(issue["type"], issue["type"])
            print(f"      ⚠️  {label} — {issue['detail']}")

    if len(flagged) > 15:
        print(f"\n    … et {len(flagged) - 15} autre(s) question(s)")


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path) -> dict:
    try:
        questions, lang = load_data(path)
    except Exception as e:
        return {
            "filter": "FLE2",
            "name": "CECRL + Qualité options",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {},
        }

    if lang != "en":
        return {
            "filter": "FLE2",
            "name": "CECRL + Qualité options",
            "file": str(path),
            "total_questions": len(questions),
            "error_count": 0,
            "passed": True,
            "summary": f"Ignoré (lang={lang})",
            "details": {"skipped": True, "lang": lang},
        }

    total = len(questions)
    flagged = analyze_questions(questions)
    counts = count_by_type(flagged)

    summary_parts = []
    for t, label in TYPE_LABELS.items():
        if t in counts:
            summary_parts.append(f"{counts[t]} {label.lower()}")

    return {
        "filter": "FLE2",
        "name": "CECRL + Qualité options",
        "file": str(path),
        "total_questions": total,
        "error_count": len(flagged),
        "passed": len(flagged) == 0,
        "summary": "FLE2 conforme" if not flagged else " | ".join(summary_parts),
        "details": {
            "lang": lang,
            "flagged_questions": flagged,
            "counts_by_type": counts,
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter_fle_cecrl_level.py <fichier.json|dossier/>")
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
            print(f"\n  FLE2 — {path.name} : ⏭️  ignoré (lang={d.get('lang')})")
            continue

        print_report(
            path,
            d.get("lang", ""),
            result["total_questions"],
            d.get("flagged_questions", []),
        )

        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit FLE2 terminé — problèmes détectés")
        sys.exit(1)
    else:
        print("  ✅ Audit FLE2 terminé — conforme")
        sys.exit(0)


if __name__ == "__main__":
    main()
