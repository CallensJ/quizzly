"""
Rééquilibre la distribution des réponses (A/B/C/D) dans les fichiers JSON de questions.
- Mélange aléatoirement les options de chaque question (seed fixe pour reproductibilité)
- Met à jour le champ 'answer' pour pointer vers la nouvelle position de la bonne réponse
- Supprime les doublons (basé sur le texte de la question, conserve le premier)
- Vérifie la distribution finale

Usage: python3 scripts/fix-answers-distribution.py [fichier.json ...]
       python3 scripts/fix-answers-distribution.py  (traite tous les fichiers heroes)
"""

import json
import random
import sys
import os
from collections import Counter
from pathlib import Path

SEED = 42  # seed fixe pour reproductibilité

def rebalance_options(question: dict, target_slot: str, rng: random.Random) -> dict:
    """Place la bonne réponse dans target_slot et mélange les autres options aléatoirement."""
    q = dict(question)
    options = q["options"]
    correct_text = options[q["answer"]]

    keys = ["A", "B", "C", "D"]
    other_values = [v for k, v in options.items() if v != correct_text]
    rng.shuffle(other_values)

    new_options = {}
    other_iter = iter(other_values)
    for k in keys:
        if k == target_slot:
            new_options[k] = correct_text
        else:
            new_options[k] = next(other_iter)

    q["options"] = new_options
    q["answer"] = target_slot
    return q


def deduplicate(questions: list) -> tuple[list, int]:
    """Supprime les doublons par texte de question (garde le premier)."""
    seen = {}
    result = []
    for q in questions:
        text = q.get("question", "").strip()
        if text not in seen:
            seen[text] = True
            result.append(q)
    removed = len(questions) - len(result)
    return result, removed


def distribution(questions: list) -> dict:
    return Counter(q.get("answer") for q in questions)


def print_distribution(label: str, counts: Counter, total: int):
    print(f"  {label}:")
    for k in ["A", "B", "C", "D"]:
        n = counts.get(k, 0)
        pct = n / total * 100 if total else 0
        bar = "█" * int(pct / 2)
        print(f"    {k}: {n:3d} ({pct:5.1f}%) {bar}")


def process_file(path: Path):
    print(f"\n{'='*60}")
    print(f"Fichier : {path.name}")

    with open(path) as f:
        data = json.load(f)

    questions = data["questions"]
    total_before = len(questions)
    dist_before = distribution(questions)

    print(f"  Questions avant : {total_before}")
    print_distribution("Avant", dist_before, total_before)

    # 1. Dédoublonnage
    questions, removed = deduplicate(questions)
    if removed:
        print(f"  Doublons supprimés : {removed}")

    # 2. Rééquilibrage des réponses — rotation stricte ABCDABCD...
    rng = random.Random(SEED)
    slots = ["A", "B", "C", "D"]
    questions = [rebalance_options(q, slots[i % 4], rng) for i, q in enumerate(questions)]

    total_after = len(questions)
    dist_after = distribution(questions)

    print(f"  Questions après  : {total_after}")
    print_distribution("Après", dist_after, total_after)

    # 3. Sauvegarde
    data["questions"] = questions
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"  ✓ Fichier sauvegardé")


def main():
    base = Path(__file__).parent.parent / "src" / "data" / "questions"

    if len(sys.argv) > 1:
        paths = [Path(p) for p in sys.argv[1:]]
    else:
        paths = [
            base / "fr" / "heroes.json",
            base / "en" / "heroes.json",
        ]

    for path in paths:
        if not path.exists():
            print(f"Fichier introuvable : {path}")
            continue
        process_file(path)

    print("\nTerminé.")


if __name__ == "__main__":
    main()
