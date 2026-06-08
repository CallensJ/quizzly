"""
filter_structure.py — G4 — Validation structurelle des fichiers JSON de questions Erudia

Vérifie :
  - JSON syntaxiquement valide
  - Champs obligatoires présents : id, difficulty, question, options (A/B/C/D), answer
  - Valeur `answer` dans [A, B, C, D]
  - Valeur `difficulty` dans [easy, medium, hard]
  - Options non vides
  - Options non identiques entre elles
  - Format ID cohérent : {slug}-{lang}-{NNNN} (ex: civic-en-0001)
  - Champs racine présents : category, lang, questions

Usage :
  python3 filter_structure.py <fichier.json>
  python3 filter_structure.py <dossier/>

Retourne :
  exit 0 si aucune erreur structurelle
  exit 1 si erreurs détectées
"""

import json
import re
import sys
from pathlib import Path

# ──────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────

REQUIRED_QUESTION_FIELDS = {"id", "difficulty", "question", "options", "answer"}
VALID_ANSWERS = {"A", "B", "C", "D"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}
VALID_LANGS = {"fr", "en"}
OPTION_KEYS = ["A", "B", "C", "D"]

# Pattern ID : une ou plusieurs parties slug séparées par tirets, puis lang, puis numéro 4+ chiffres
# Exemples valides : civic-en-0001, fra-en-0001, sciences-fr-0042
ID_PATTERN = re.compile(r"^[a-z][a-z0-9\-]+-(?:fr|en)-\d{4,}$")


# ──────────────────────────────────────────────
# Validation
# ──────────────────────────────────────────────


def validate_file(path: Path) -> list[dict]:
    """
    Valide la structure d'un fichier JSON.
    Retourne une liste d'erreurs (vide = fichier valide).
    """
    errors = []

    # 1. JSON syntaxiquement valide
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return [{"type": "INVALID_JSON", "message": str(e), "id": None}]
    except Exception as e:
        return [{"type": "FILE_ERROR", "message": str(e), "id": None}]

    # 2. Structure racine
    if isinstance(data, list):
        errors.append(
            {
                "type": "MISSING_ROOT_WRAPPER",
                "message": "Fichier est une liste directe — attendu: {category, lang, questions: [...]}",
                "id": None,
            }
        )
        questions = data
    else:
        for field in ["category", "lang", "questions"]:
            if field not in data:
                errors.append(
                    {
                        "type": "MISSING_ROOT_FIELD",
                        "message": f"Champ racine manquant : '{field}'",
                        "id": None,
                    }
                )

        lang = data.get("lang", "")
        if lang and lang not in VALID_LANGS:
            errors.append(
                {
                    "type": "INVALID_LANG",
                    "message": f"lang='{lang}' invalide — attendu: fr | en",
                    "id": None,
                }
            )

        questions = data.get("questions", [])

    if not isinstance(questions, list):
        return errors + [
            {
                "type": "QUESTIONS_NOT_LIST",
                "message": "'questions' n'est pas une liste",
                "id": None,
            }
        ]

    # 3. Validation question par question
    for i, q in enumerate(questions):
        qid = q.get("id", f"index_{i}")

        # Champs obligatoires
        missing = REQUIRED_QUESTION_FIELDS - set(q.keys())
        if missing:
            errors.append(
                {
                    "type": "MISSING_FIELDS",
                    "message": f"Champs manquants : {sorted(missing)}",
                    "id": qid,
                }
            )
            continue  # Inutile de continuer si champs manquants

        # Format ID
        if not ID_PATTERN.match(q["id"]):
            errors.append(
                {
                    "type": "INVALID_ID_FORMAT",
                    "message": f"ID '{q['id']}' ne respecte pas le pattern {{slug}}-{{lang}}-{{NNNN}}",
                    "id": qid,
                }
            )

        # Difficulté
        if q["difficulty"] not in VALID_DIFFICULTIES:
            errors.append(
                {
                    "type": "INVALID_DIFFICULTY",
                    "message": f"difficulty='{q['difficulty']}' invalide — attendu: easy | medium | hard",
                    "id": qid,
                }
            )

        # Answer
        answer = q["answer"]
        if answer not in VALID_ANSWERS:
            errors.append(
                {
                    "type": "INVALID_ANSWER",
                    "message": f"answer='{answer}' invalide — attendu: A | B | C | D",
                    "id": qid,
                }
            )

        # Question non vide
        if not q["question"] or not q["question"].strip():
            errors.append(
                {
                    "type": "EMPTY_QUESTION",
                    "message": "Texte de la question vide",
                    "id": qid,
                }
            )

        # Longueur question raisonnable
        if len(q["question"]) > 300:
            errors.append(
                {
                    "type": "QUESTION_TOO_LONG",
                    "message": f"Question trop longue : {len(q['question'])} caractères (max 300)",
                    "id": qid,
                }
            )

        # Options : présence des 4 clés
        options = q.get("options", {})
        if not isinstance(options, dict):
            errors.append(
                {
                    "type": "OPTIONS_NOT_DICT",
                    "message": "Le champ 'options' n'est pas un objet",
                    "id": qid,
                }
            )
            continue

        missing_opts = [k for k in OPTION_KEYS if k not in options]
        if missing_opts:
            errors.append(
                {
                    "type": "MISSING_OPTIONS",
                    "message": f"Options manquantes : {missing_opts}",
                    "id": qid,
                }
            )
            continue

        # Options non vides
        empty_opts = [k for k in OPTION_KEYS if not str(options.get(k, "")).strip()]
        if empty_opts:
            errors.append(
                {
                    "type": "EMPTY_OPTIONS",
                    "message": f"Options vides : {empty_opts}",
                    "id": qid,
                }
            )

        # Options non identiques (doublon de valeur)
        values = [str(options[k]).strip().lower() for k in OPTION_KEYS]
        seen = {}
        for k, v in zip(OPTION_KEYS, values):
            if v in seen:
                errors.append(
                    {
                        "type": "DUPLICATE_OPTION_VALUES",
                        "message": f"Options identiques : {seen[v]}='{options[seen[v]]}' et {k}='{options[k]}'",
                        "id": qid,
                    }
                )
            else:
                seen[v] = k

        # Answer pointe vers une option existante
        if answer in VALID_ANSWERS and answer not in options:
            errors.append(
                {
                    "type": "ANSWER_OPTION_MISSING",
                    "message": f"answer='{answer}' mais l'option '{answer}' n'existe pas",
                    "id": qid,
                }
            )

    return errors


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────


def print_report(path: Path, errors: list[dict], total_questions: int) -> bool:
    """Affiche le rapport et retourne True si le fichier est valide."""
    print(f"\n{'═' * 60}")
    print(f"  G4 — Structure : {path.name}")
    print(f"{'═' * 60}")
    print(f"  Questions analysées : {total_questions}")

    if not errors:
        print(f"  ✅ Aucune erreur structurelle détectée")
        return True

    # Grouper par type
    by_type: dict[str, list] = {}
    for e in errors:
        by_type.setdefault(e["type"], []).append(e)

    print(f"  ❌ {len(errors)} erreur(s) détectée(s)\n")

    for error_type, items in by_type.items():
        print(f"  [{error_type}] — {len(items)} occurrence(s)")
        for item in items[:5]:  # Max 5 exemples par type
            id_label = f"  ID: {item['id']}" if item["id"] else "  (racine)"
            print(f"    {id_label} → {item['message']}")
        if len(items) > 5:
            print(f"    … et {len(items) - 5} autre(s)")
        print()

    return False


# ──────────────────────────────────────────────
# Résultat machine-readable (pour quality_audit.py)
# ──────────────────────────────────────────────


def run(path: Path) -> dict:
    """
    Interface utilisée par quality_audit.py.
    Retourne un dict standardisé.
    """
    errors = validate_file(path)

    # Compter les questions si possible
    total = 0
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        qs = data if isinstance(data, list) else data.get("questions", [])
        total = len(qs)
    except Exception:
        pass

    passed = len(
        [
            e
            for e in errors
            if e["type"] not in ["INVALID_JSON", "FILE_ERROR", "QUESTIONS_NOT_LIST"]
        ]
    )

    return {
        "filter": "G4",
        "name": "Structure",
        "file": str(path),
        "total_questions": total,
        "errors": errors,
        "error_count": len(errors),
        "passed": len(errors) == 0,
        "summary": f"{len(errors)} erreur(s) structurelle(s)",
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter_structure.py <fichier.json|dossier/>")
        sys.exit(1)

    target = Path(sys.argv[1])
    has_errors = False

    if target.is_dir():
        files = sorted(target.rglob("*.json"))
        if not files:
            print(f"Aucun fichier JSON trouvé dans {target}")
            sys.exit(1)
    elif target.is_file():
        files = [target]
    else:
        print(f"Chemin introuvable : {target}")
        sys.exit(1)

    for path in files:
        result = run(path)
        valid = print_report(path, result["errors"], result["total_questions"])
        if not valid:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit G4 terminé — erreurs détectées")
        sys.exit(1)
    else:
        print("  ✅ Audit G4 terminé — tous les fichiers sont valides")
        sys.exit(0)


if __name__ == "__main__":
    main()
