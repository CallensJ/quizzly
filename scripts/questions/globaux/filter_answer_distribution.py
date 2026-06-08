"""
filter_answer_distribution.py — G2 — Vérification de la distribution des réponses correctes

Vérifie :
  - Distribution A/B/C/D équilibrée (tolérance configurable, défaut : ±10%)
  - Détecte les séquences consécutives identiques (ex: A,A,A,A,A = biais de pattern)
  - Signale la lettre sur/sous-représentée

Seuil par défaut : écart max 10% entre la lettre la plus fréquente et la moins fréquente.
Exemple : 600 questions → cible 25% (150) par lettre → tolérance 15%–35% par lettre.

Séquences consécutives : alerte si une même lettre apparaît 4 fois de suite ou plus.

⚠️  Ce script est en lecture seule — il ne modifie aucun fichier.
    Pour rééquilibrer, utiliser fix-answers-distribution.py.

Usage :
  python3 filter_answer_distribution.py <fichier.json>
  python3 filter_answer_distribution.py <dossier/>
  python3 filter_answer_distribution.py <fichier.json> --threshold 15

Retourne :
  exit 0 si distribution équilibrée
  exit 1 si déséquilibre détecté
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

# ──────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────

DEFAULT_THRESHOLD = 10  # % d'écart max entre min et max
CONSECUTIVE_LIMIT = 4  # nb de fois qu'une même lettre peut apparaître consécutivement
VALID_ANSWERS = ["A", "B", "C", "D"]


# ──────────────────────────────────────────────
# Analyse
# ──────────────────────────────────────────────


def load_questions(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("questions", [])


def analyze_distribution(questions: list[dict]) -> dict:
    """Calcule la distribution A/B/C/D en count et pourcentage."""
    total = len(questions)
    counts = Counter(q.get("answer", "").strip().upper() for q in questions)

    result = {}
    for k in VALID_ANSWERS:
        n = counts.get(k, 0)
        result[k] = {"count": n, "pct": round(n / total * 100, 1) if total else 0.0}

    invalid = {k: v for k, v in counts.items() if k not in VALID_ANSWERS}
    return result, invalid, total


def check_balance(dist: dict, threshold: float) -> tuple[bool, float, str, str]:
    """
    Vérifie si la distribution est équilibrée.
    Retourne (is_balanced, gap, worst_letter, best_letter).
    """
    pcts = {k: dist[k]["pct"] for k in VALID_ANSWERS}
    worst = max(pcts, key=pcts.get)
    best = min(pcts, key=pcts.get)
    gap = round(pcts[worst] - pcts[best], 1)
    return gap <= threshold, gap, worst, best


def find_consecutive_sequences(questions: list[dict], limit: int) -> list[dict]:
    """
    Détecte les séquences de `limit` réponses identiques consécutives.
    Retourne la liste des séquences problématiques avec leur position.
    """
    issues = []
    answers = [q.get("answer", "").strip().upper() for q in questions]

    i = 0
    while i < len(answers):
        letter = answers[i]
        if letter not in VALID_ANSWERS:
            i += 1
            continue

        # Compter la séquence
        j = i
        while j < len(answers) and answers[j] == letter:
            j += 1

        length = j - i
        if length >= limit:
            issues.append(
                {
                    "letter": letter,
                    "length": length,
                    "start_index": i,
                    "end_index": j - 1,
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
    dist: dict,
    invalid: dict,
    total: int,
    balanced: bool,
    gap: float,
    worst: str,
    best: str,
    sequences: list[dict],
    threshold: float,
):

    print(f"\n{'═' * 60}")
    print(f"  G2 — Distribution réponses : {path.name}")
    print(f"{'═' * 60}")
    print(f"  Questions analysées : {total}")
    print(f"  Seuil tolérance     : ±{threshold}%\n")

    # Distribution visuelle
    for k in VALID_ANSWERS:
        n = dist[k]["count"]
        pct = dist[k]["pct"]
        bar = "█" * int(pct / 2)
        flag = " ⚠️" if k == worst and not balanced else ""
        print(f"  {k}  {n:>4}  ({pct:>5.1f}%)  {bar}{flag}")

    if invalid:
        print(f"\n  ⚠️  Valeurs answer invalides : {dict(invalid)}")

    # Résultat équilibre
    print()
    if balanced:
        print(f"  ✅ Distribution équilibrée (écart max : {gap}%)")
    else:
        print(f"  ❌ Déséquilibre détecté")
        print(
            f"     {worst} = {dist[worst]['pct']}%  vs  {best} = {dist[best]['pct']}%  (écart : {gap}%)"
        )

    # Séquences consécutives
    if sequences:
        print(f"\n  ❌ Séquences consécutives >= {CONSECUTIVE_LIMIT} :")
        for s in sequences:
            print(
                f"     {s['letter']} × {s['length']}  "
                f"[index {s['start_index']}→{s['end_index']}]  "
                f"{s['start_id']} → {s['end_id']}"
            )
    else:
        print(f"  ✅ Aucune séquence consécutive >= {CONSECUTIVE_LIMIT}")


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path, threshold: float = DEFAULT_THRESHOLD) -> dict:
    """
    Interface standardisée appelée par quality_audit.py.
    Retourne un dict avec les résultats du filtre.
    """
    try:
        questions = load_questions(path)
    except Exception as e:
        return {
            "filter": "G2",
            "name": "Distribution réponses",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {},
        }

    dist, invalid, total = analyze_distribution(questions)
    balanced, gap, worst, best = check_balance(dist, threshold)
    sequences = find_consecutive_sequences(questions, CONSECUTIVE_LIMIT)

    errors = []
    if not balanced:
        errors.append(
            f"Déséquilibre {worst}/{best} : écart {gap}% (seuil {threshold}%)"
        )
    if invalid:
        errors.append(f"Valeurs answer invalides : {list(invalid.keys())}")
    for s in sequences:
        errors.append(
            f"Séquence {s['letter']} × {s['length']} à l'index {s['start_index']}"
        )

    return {
        "filter": "G2",
        "name": "Distribution réponses",
        "file": str(path),
        "total_questions": total,
        "error_count": len(errors),
        "passed": len(errors) == 0,
        "summary": "Distribution équilibrée" if not errors else " | ".join(errors),
        "details": {
            "distribution": dist,
            "gap": gap,
            "balanced": balanced,
            "consecutive_sequences": sequences,
            "invalid_answers": dict(invalid),
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Vérifie la distribution des réponses A/B/C/D dans les fichiers JSON Erudia."
    )
    parser.add_argument("path", help="Fichier JSON ou dossier")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Écart max autorisé en %% entre min et max (défaut : {DEFAULT_THRESHOLD})",
    )
    args = parser.parse_args()

    target = Path(args.path)
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
        result = run(path, threshold=args.threshold)
        d = result["details"]

        if d:
            print_report(
                path,
                d.get("distribution", {}),
                d.get("invalid_answers", {}),
                result["total_questions"],
                d.get("balanced", True),
                d.get("gap", 0),
                max(
                    d.get("distribution", {"A": {"pct": 0}}),
                    key=lambda k: d["distribution"][k]["pct"],
                )
                if d.get("distribution")
                else "A",
                min(
                    d.get("distribution", {"A": {"pct": 0}}),
                    key=lambda k: d["distribution"][k]["pct"],
                )
                if d.get("distribution")
                else "D",
                d.get("consecutive_sequences", []),
                args.threshold,
            )

        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit G2 terminé — déséquilibre détecté")
        sys.exit(1)
    else:
        print("  ✅ Audit G2 terminé — distribution correcte")
        sys.exit(0)


if __name__ == "__main__":
    main()
