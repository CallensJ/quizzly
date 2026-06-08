"""
filter_difficulty_distribution.py — G3 — Vérification de la distribution des niveaux de difficulté

Vérifie :
  - Ratio easy/medium/hard conforme à la cible BRD : 150/225/225 (25% / 37.5% / 37.5%)
  - Tolérance configurable (défaut : ±8% par niveau)
  - Signale les niveaux sur/sous-représentés

Cibles BRD v2 (600 questions/catégorie) :
  easy   : 150  (25.0%)
  medium : 225  (37.5%)
  hard   : 225  (37.5%)

Usage :
  python3 filter_difficulty_distribution.py <fichier.json>
  python3 filter_difficulty_distribution.py <dossier/>
  python3 filter_difficulty_distribution.py <fichier.json> --threshold 10

Retourne :
  exit 0 si distribution conforme
  exit 1 si écart détecté
"""

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

# ──────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────

DEFAULT_THRESHOLD = 8  # % d'écart max par niveau vs cible

# Cibles BRD v2 en pourcentage
TARGETS = {
    "easy": 25.0,
    "medium": 37.5,
    "hard": 37.5,
}

VALID_DIFFICULTIES = ["easy", "medium", "hard"]


# ──────────────────────────────────────────────
# Analyse
# ──────────────────────────────────────────────


def load_questions(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("questions", [])


def analyze_difficulty(questions: list[dict]) -> tuple[dict, dict]:
    """
    Calcule la distribution easy/medium/hard.
    Retourne (dist, invalid) où invalid = valeurs hors VALID_DIFFICULTIES.
    """
    total = len(questions)
    counts = Counter(q.get("difficulty", "").strip().lower() for q in questions)

    dist = {}
    for k in VALID_DIFFICULTIES:
        n = counts.get(k, 0)
        dist[k] = {
            "count": n,
            "pct": round(n / total * 100, 1) if total else 0.0,
            "target_pct": TARGETS[k],
            "target_count": round(TARGETS[k] / 100 * total),
        }

    invalid = {k: v for k, v in counts.items() if k not in VALID_DIFFICULTIES}
    return dist, invalid, total


def check_distribution(dist: dict, threshold: float) -> list[dict]:
    """
    Vérifie chaque niveau vs sa cible.
    Retourne la liste des niveaux hors tolérance.
    """
    issues = []
    for level, data in dist.items():
        gap = round(abs(data["pct"] - data["target_pct"]), 1)
        if gap > threshold:
            issues.append(
                {
                    "level": level,
                    "actual_pct": data["pct"],
                    "target_pct": data["target_pct"],
                    "gap": gap,
                    "actual_count": data["count"],
                    "target_count": data["target_count"],
                    "direction": "sur-représenté"
                    if data["pct"] > data["target_pct"]
                    else "sous-représenté",
                }
            )
    return issues


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────


def print_report(
    path: Path,
    dist: dict,
    invalid: dict,
    total: int,
    issues: list[dict],
    threshold: float,
):

    print(f"\n{'═' * 60}")
    print(f"  G3 — Distribution difficulté : {path.name}")
    print(f"{'═' * 60}")
    print(f"  Questions analysées : {total}")
    print(f"  Seuil tolérance     : ±{threshold}% par niveau\n")

    # Tableau distribution
    print(
        f"  {'Niveau':<8}  {'Count':>5}  {'Actuel':>7}  {'Cible':>7}  {'Écart':>6}  Statut"
    )
    print(f"  {'─' * 8}  {'─' * 5}  {'─' * 7}  {'─' * 7}  {'─' * 6}  {'─' * 10}")

    issue_levels = {i["level"] for i in issues}
    for level in VALID_DIFFICULTIES:
        d = dist[level]
        gap = round(abs(d["pct"] - d["target_pct"]), 1)
        status = "❌" if level in issue_levels else "✅"
        print(
            f"  {level:<8}  {d['count']:>5}  {d['pct']:>6.1f}%  "
            f"{d['target_pct']:>6.1f}%  {gap:>5.1f}%  {status}"
        )

    if invalid:
        print(f"\n  ⚠️  Valeurs difficulty invalides : {dict(invalid)}")

    print()
    if not issues:
        print("  ✅ Distribution conforme aux cibles BRD")
    else:
        print(f"  ❌ {len(issues)} niveau(x) hors tolérance :\n")
        for issue in issues:
            print(
                f"     {issue['level']:<8} : {issue['actual_pct']}% vs cible {issue['target_pct']}%"
                f"  →  {issue['direction']} de {issue['gap']}%"
            )
            delta = issue["actual_count"] - issue["target_count"]
            direction_str = f"+{delta}" if delta > 0 else str(delta)
            print(
                f"              {issue['actual_count']} questions ({direction_str} vs cible {issue['target_count']})"
            )


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path, threshold: float = DEFAULT_THRESHOLD) -> dict:
    """
    Interface standardisée appelée par quality_audit.py.
    """
    try:
        questions = load_questions(path)
    except Exception as e:
        return {
            "filter": "G3",
            "name": "Distribution difficulté",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {},
        }

    dist, invalid, total = analyze_difficulty(questions)
    issues = check_distribution(dist, threshold)

    errors = []
    for issue in issues:
        errors.append(
            f"{issue['level']} {issue['direction']} : {issue['actual_pct']}% vs cible {issue['target_pct']}%"
        )
    if invalid:
        errors.append(f"Valeurs difficulty invalides : {list(invalid.keys())}")

    return {
        "filter": "G3",
        "name": "Distribution difficulté",
        "file": str(path),
        "total_questions": total,
        "error_count": len(errors),
        "passed": len(errors) == 0,
        "summary": "Distribution conforme" if not errors else " | ".join(errors),
        "details": {
            "distribution": dist,
            "issues": issues,
            "invalid_difficulties": dict(invalid),
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Vérifie la distribution easy/medium/hard dans les fichiers JSON Erudia."
    )
    parser.add_argument("path", help="Fichier JSON ou dossier")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Écart max autorisé en %% par niveau vs cible (défaut : {DEFAULT_THRESHOLD})",
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
                d.get("invalid_difficulties", {}),
                result["total_questions"],
                d.get("issues", []),
                args.threshold,
            )
        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit G3 terminé — distribution non conforme")
        sys.exit(1)
    else:
        print("  ✅ Audit G3 terminé — distribution conforme")
        sys.exit(0)


if __name__ == "__main__":
    main()
