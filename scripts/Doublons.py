"""
Doublons.py — Analyse générique des fichiers de questions JSON Erudia
Usage :
  python scripts/Doublons.py src/data/questions/en/sciences.json
  python scripts/Doublons.py src/data/questions/fr/histoire.json --fix
  python scripts/Doublons.py src/data/questions/  # tous les fichiers d'un dossier

Options :
  --fix        Supprime les doublons exacts et réécrit le fichier (backup .bak créé)
  --csv        Exporte le rapport dans un fichier CSV à côté du JSON analysé
  --quiet      N'affiche que le résumé final (pas les listes de doublons)
"""

import json
import re
import sys
import os
import csv
import shutil
import argparse
from pathlib import Path
from collections import defaultdict


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def normalize(text: str) -> str:
    """Supprime ponctuation, casse et espaces pour comparaison floue."""
    return re.sub(r"[^a-z0-9]", "", text.lower().strip())


def options_key(q: dict) -> str:
    """Clé canonique des 4 options (triées, casse normalisée)."""
    opts = q.get("options", {})
    values = [str(opts.get(k, "")).lower().strip() for k in ["A", "B", "C", "D"]]
    return "|".join(sorted(values))


def load_questions(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else data.get("questions", [])


# ──────────────────────────────────────────────
# Analyses
# ──────────────────────────────────────────────

def analyze_answer_distribution(questions: list[dict]) -> dict:
    counts = {"A": 0, "B": 0, "C": 0, "D": 0, "OTHER": 0}
    answer_field = None
    for q in questions:
        for field in ("answer", "correctAnswer", "correct_answer"):
            if field in q:
                answer_field = field
                break
        break

    for q in questions:
        ans = q.get(answer_field or "answer", "")
        if ans in counts:
            counts[ans] += 1
        else:
            counts["OTHER"] += 1

    total = len(questions)
    result = {}
    for k, v in counts.items():
        if k == "OTHER" and v == 0:
            continue
        result[k] = {"count": v, "pct": round(v / total * 100, 1) if total else 0}
    return result


def find_exact_duplicates(questions: list[dict]) -> list[tuple]:
    """Retourne les paires (q1, q2) avec texte identique."""
    seen = {}
    dups = []
    for q in questions:
        text = (q.get("question") or "").strip().lower()
        if text in seen:
            dups.append((seen[text], q))
        else:
            seen[text] = q
    return dups


def find_normalized_duplicates(questions: list[dict]) -> list[tuple]:
    """Retourne les paires (q1, q2) avec texte normalisé identique (ponctuation/casse)."""
    seen = {}
    dups = []
    for q in questions:
        norm = normalize(q.get("question") or "")
        if norm in seen:
            dups.append((seen[norm], q))
        else:
            seen[norm] = q
    return dups


def find_option_duplicates(questions: list[dict]) -> list[tuple]:
    """Retourne les paires (q1, q2) partageant exactement les mêmes options (sans doublon de question)."""
    exact_norm = {normalize(q.get("question") or "") for q in questions}
    seen = {}
    dups = []
    norm_seen_pairs = set()

    for q in questions:
        key = options_key(q)
        norm_q = normalize(q.get("question") or "")
        if key in seen:
            pair_key = tuple(sorted([seen[key].get("id", ""), q.get("id", "")]))
            if pair_key not in norm_seen_pairs:
                dups.append((seen[key], q))
                norm_seen_pairs.add(pair_key)
        else:
            seen[key] = q
    return dups


def find_id_locale_mismatch(questions: list[dict]) -> list[dict]:
    """Détecte les questions dont l'ID ne contient pas la locale déclarée."""
    mismatches = []
    for q in questions:
        locale = q.get("locale", "")
        qid = q.get("id", "")
        if locale and qid and f"-{locale}-" not in qid and not qid.startswith(f"{locale}-"):
            mismatches.append(q)
    return mismatches


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────

def print_section(title: str):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print(f"{'─'*60}")


def print_distribution(dist: dict, total: int):
    print_section("Distribution des réponses correctes")
    print(f"  Total questions : {total}\n")
    for key in ["A", "B", "C", "D", "OTHER"]:
        if key not in dist:
            continue
        bar = "█" * int(dist[key]["pct"] / 2)
        print(f"  {key}  {dist[key]['count']:>4}  ({dist[key]['pct']:>5.1f}%)  {bar}")


def print_duplicates(label: str, dups: list[tuple], quiet: bool):
    print_section(label)
    print(f"  Nombre de doublons : {len(dups)}")
    if not quiet and dups:
        for q1, q2 in dups[:20]:
            print(f"\n  ┌ {q1.get('id','?')}  {(q1.get('question') or '')[:70]}")
            print(f"  └ {q2.get('id','?')}  {(q2.get('question') or '')[:70]}")
        if len(dups) > 20:
            print(f"\n  … et {len(dups) - 20} autres.")


def print_id_mismatches(mismatches: list[dict], quiet: bool):
    print_section("IDs avec préfixe locale incorrect")
    print(f"  Nombre : {len(mismatches)}")
    if not quiet and mismatches:
        for q in mismatches[:10]:
            print(f"  {q.get('id')}  (locale={q.get('locale')})")


# ──────────────────────────────────────────────
# Export CSV
# ──────────────────────────────────────────────

def export_csv(path: Path, exact: list, normalized: list, opts: list, mismatches: list):
    csv_path = path.with_suffix(".duplicates.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["type", "id_1", "question_1", "id_2", "question_2"])
        for q1, q2 in exact:
            writer.writerow(["exact", q1.get("id"), q1.get("question","")[:100], q2.get("id"), q2.get("question","")[:100]])
        for q1, q2 in normalized:
            writer.writerow(["normalized", q1.get("id"), q1.get("question","")[:100], q2.get("id"), q2.get("question","")[:100]])
        for q1, q2 in opts:
            writer.writerow(["same_options", q1.get("id"), q1.get("question","")[:100], q2.get("id"), q2.get("question","")[:100]])
        for q in mismatches:
            writer.writerow(["id_locale_mismatch", q.get("id"), q.get("question","")[:100], "", ""])
    print(f"\n  CSV exporté : {csv_path}")


# ──────────────────────────────────────────────
# Fix (suppression doublons exacts)
# ──────────────────────────────────────────────

def fix_exact_duplicates(path: Path, questions: list[dict]) -> int:
    seen = {}
    deduped = []
    removed = 0
    for q in questions:
        text = (q.get("question") or "").strip().lower()
        if text not in seen:
            seen[text] = True
            deduped.append(q)
        else:
            removed += 1

    backup = path.with_suffix(".json.bak")
    shutil.copy(path, backup)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)
    print(f"\n  Backup : {backup}")
    print(f"  {removed} doublons exacts supprimés. Fichier réécrit : {path}")
    return removed


# ──────────────────────────────────────────────
# Analyse d'un fichier
# ──────────────────────────────────────────────

def analyze_file(path: Path, args: argparse.Namespace):
    print(f"\n{'═'*60}")
    print(f"  Fichier : {path}")
    print(f"{'═'*60}")

    questions = load_questions(path)
    total = len(questions)

    dist = analyze_answer_distribution(questions)
    print_distribution(dist, total)

    exact = find_exact_duplicates(questions)
    print_duplicates("Doublons — texte exact", exact, args.quiet)

    normalized = find_normalized_duplicates(questions)
    # Soustraire les exacts pour n'afficher que les doublons purement de casse/ponctuation
    extra_norm = [p for p in normalized if p not in exact]
    print_duplicates("Doublons — texte normalisé (ponctuation/casse seulement)", extra_norm, args.quiet)

    opts = find_option_duplicates(questions)
    # Ne garder que ceux qui ne sont pas déjà des doublons exacts
    exact_ids = {(q1.get("id"), q2.get("id")) for q1, q2 in exact}
    extra_opts = [(q1, q2) for q1, q2 in opts if (q1.get("id"), q2.get("id")) not in exact_ids]
    print_duplicates("Doublons — options identiques (questions différentes)", extra_opts, args.quiet)

    mismatches = find_id_locale_mismatch(questions)
    print_id_mismatches(mismatches, args.quiet)

    if args.csv:
        export_csv(path, exact, extra_norm, extra_opts, mismatches)

    if args.fix and exact:
        fix_exact_duplicates(path, questions)

    # Résumé
    print(f"\n  ── Résumé ──")
    print(f"  Questions totales     : {total}")
    print(f"  Doublons exacts       : {len(exact)}")
    print(f"  Doublons normalisés   : {len(extra_norm)}")
    print(f"  Options identiques    : {len(extra_opts)}")
    print(f"  Locale ID mismatch    : {len(mismatches)}")

    # Alerte déséquilibre
    pcts = [dist[k]["pct"] for k in ["A", "B", "C", "D"] if k in dist]
    if pcts and (max(pcts) - min(pcts)) > 10:
        worst = max(["A", "B", "C", "D"], key=lambda k: dist.get(k, {}).get("pct", 0))
        best = min(["A", "B", "C", "D"], key=lambda k: dist.get(k, {}).get("pct", 0))
        print(f"\n  ⚠️  Déséquilibre détecté : {worst}={dist[worst]['pct']}% vs {best}={dist[best]['pct']}%")


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Analyse doublons et distribution des réponses dans les fichiers JSON de questions Erudia."
    )
    parser.add_argument("path", help="Fichier JSON ou dossier contenant des fichiers JSON")
    parser.add_argument("--fix", action="store_true", help="Supprime les doublons exacts et réécrit le fichier")
    parser.add_argument("--csv", action="store_true", help="Exporte un rapport CSV des doublons")
    parser.add_argument("--quiet", action="store_true", help="Résumé seul, sans lister les doublons")
    args = parser.parse_args()

    target = Path(args.path)

    if target.is_dir():
        files = sorted(target.rglob("*.json"))
        if not files:
            print(f"Aucun fichier JSON trouvé dans {target}")
            sys.exit(1)
        for f in files:
            analyze_file(f, args)
    elif target.is_file():
        analyze_file(target, args)
    else:
        print(f"Chemin introuvable : {target}")
        sys.exit(1)


if __name__ == "__main__":
    main()
