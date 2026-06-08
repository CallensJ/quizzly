"""
filter_duplicates.py — G1 — Détection des doublons dans les fichiers JSON de questions Erudia

Vérifie :
  - Doublons exacts       : texte de question identique (casse + ponctuation)
  - Doublons normalisés   : texte identique après suppression ponctuation/casse/espaces
                            (détecte les quasi-doublons type "Qu'est-ce que X ?" vs "Qu est ce que X")
  - Doublons par options  : 4 options identiques pour deux questions différentes
                            (même distracteurs = probablement même concept, doublon déguisé)

⚠️  Ce script est en lecture seule — il ne modifie aucun fichier.
    Pour corriger les doublons, utiliser fix-answers-distribution.py (--dedup).

Usage :
  python3 filter_duplicates.py <fichier.json>
  python3 filter_duplicates.py <dossier/>

Retourne :
  exit 0 si aucun doublon détecté
  exit 1 si doublons détectés
"""

import json
import re
import sys
from pathlib import Path

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def normalize(text: str) -> str:
    """Supprime ponctuation, casse et espaces pour comparaison floue."""
    return re.sub(r"[^a-z0-9]", "", text.lower().strip())


def options_key(q: dict) -> str:
    """Clé canonique des 4 options triées — indépendante de l'ordre A/B/C/D."""
    opts = q.get("options", {})
    values = [str(opts.get(k, "")).lower().strip() for k in ["A", "B", "C", "D"]]
    return "|".join(sorted(values))


def load_questions(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("questions", [])


# ──────────────────────────────────────────────
# Détection
# ──────────────────────────────────────────────


def find_exact_duplicates(questions: list[dict]) -> list[tuple]:
    """
    Doublons exacts : texte de question strictement identique (après strip/lower).
    Retourne les paires (q1_conservée, q2_doublon).
    """
    seen = {}
    dups = []
    for q in questions:
        text = (q.get("question") or "").strip().lower()
        if text in seen:
            dups.append((seen[text], q))
        else:
            seen[text] = q
    return dups


def find_normalized_duplicates(
    questions: list[dict], exact_pairs: list[tuple]
) -> list[tuple]:
    """
    Doublons normalisés : identiques après suppression ponctuation/casse/espaces.
    Exclut les paires déjà détectées comme doublons exacts.
    """
    exact_ids = {(q1.get("id", ""), q2.get("id", "")) for q1, q2 in exact_pairs}

    seen = {}
    dups = []
    for q in questions:
        norm = normalize(q.get("question") or "")
        if not norm:
            continue
        if norm in seen:
            pair = (seen[norm].get("id", ""), q.get("id", ""))
            if pair not in exact_ids:
                dups.append((seen[norm], q))
        else:
            seen[norm] = q
    return dups


def find_option_duplicates(
    questions: list[dict], exact_pairs: list[tuple]
) -> list[tuple]:
    """
    Doublons par options : deux questions différentes avec exactement les mêmes 4 options.
    Signe fort que c'est le même concept posé différemment.
    Exclut les paires déjà détectées comme doublons exacts.
    """
    exact_norm_ids = {
        tuple(sorted([q1.get("id", ""), q2.get("id", "")])) for q1, q2 in exact_pairs
    }

    seen = {}
    dups = []
    seen_pairs = set()

    for q in questions:
        key = options_key(q)
        if not key:
            continue
        if key in seen:
            pair_key = tuple(sorted([seen[key].get("id", ""), q.get("id", "")]))
            if pair_key not in exact_norm_ids and pair_key not in seen_pairs:
                dups.append((seen[key], q))
                seen_pairs.add(pair_key)
        else:
            seen[key] = q
    return dups


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────


def _print_pairs(label: str, pairs: list[tuple]):
    print(f"\n  [{label}] — {len(pairs)} doublon(s)")
    for q1, q2 in pairs[:10]:
        print(f"    ┌ {q1.get('id', '?'):20s}  {(q1.get('question') or '')[:65]}")
        print(f"    └ {q2.get('id', '?'):20s}  {(q2.get('question') or '')[:65]}")
    if len(pairs) > 10:
        print(f"    … et {len(pairs) - 10} autre(s)")


def print_report(path: Path, exact: list, normalized: list, options: list, total: int):
    print(f"\n{'═' * 60}")
    print(f"  G1 — Doublons : {path.name}")
    print(f"{'═' * 60}")
    print(f"  Questions analysées : {total}")

    total_issues = len(exact) + len(normalized) + len(options)

    if total_issues == 0:
        print("  ✅ Aucun doublon détecté")
        return

    print(f"  ❌ {total_issues} doublon(s) détecté(s)\n")

    if exact:
        _print_pairs("EXACT", exact)
    if normalized:
        _print_pairs("NORMALISÉ — ponctuation/casse", normalized)
    if options:
        _print_pairs("OPTIONS IDENTIQUES — questions différentes", options)


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path) -> dict:
    """
    Interface standardisée appelée par quality_audit.py.
    Retourne un dict avec les résultats du filtre.
    """
    try:
        questions = load_questions(path)
    except Exception as e:
        return {
            "filter": "G1",
            "name": "Doublons",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {"exact": [], "normalized": [], "options": []},
        }

    total = len(questions)
    exact = find_exact_duplicates(questions)
    normalized = find_normalized_duplicates(questions, exact)
    options = find_option_duplicates(questions, exact)

    total_issues = len(exact) + len(normalized) + len(options)

    return {
        "filter": "G1",
        "name": "Doublons",
        "file": str(path),
        "total_questions": total,
        "error_count": total_issues,
        "passed": total_issues == 0,
        "summary": (
            "Aucun doublon"
            if total_issues == 0
            else f"{len(exact)} exact(s) / {len(normalized)} normalisé(s) / {len(options)} options identiques"
        ),
        "details": {
            "exact": [
                {
                    "id1": q1.get("id"),
                    "id2": q2.get("id"),
                    "question": q1.get("question", "")[:80],
                }
                for q1, q2 in exact
            ],
            "normalized": [
                {
                    "id1": q1.get("id"),
                    "id2": q2.get("id"),
                    "question": q1.get("question", "")[:80],
                }
                for q1, q2 in normalized
            ],
            "options": [
                {"id1": q1.get("id"), "id2": q2.get("id")} for q1, q2 in options
            ],
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter_duplicates.py <fichier.json|dossier/>")
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
        exact = [(d["id1"], d["id2"]) for d in result["details"]["exact"]]
        normalized = [(d["id1"], d["id2"]) for d in result["details"]["normalized"]]
        options = [(d["id1"], d["id2"]) for d in result["details"]["options"]]

        # Reconstruire les paires pour l'affichage
        try:
            questions = load_questions(path)
            q_by_id = {q.get("id"): q for q in questions}

            exact_pairs = [
                (q_by_id.get(a, {"id": a}), q_by_id.get(b, {"id": b})) for a, b in exact
            ]
            norm_pairs = [
                (q_by_id.get(a, {"id": a}), q_by_id.get(b, {"id": b}))
                for a, b in normalized
            ]
            opt_pairs = [
                (q_by_id.get(a, {"id": a}), q_by_id.get(b, {"id": b}))
                for a, b in options
            ]
        except Exception:
            exact_pairs = norm_pairs = opt_pairs = []

        print_report(
            path, exact_pairs, norm_pairs, opt_pairs, result["total_questions"]
        )

        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit G1 terminé — doublons détectés")
        sys.exit(1)
    else:
        print("  ✅ Audit G1 terminé — aucun doublon")
        sys.exit(0)


if __name__ == "__main__":
    main()
