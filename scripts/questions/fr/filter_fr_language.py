"""
filter_fr_language.py — FR1 — Vérification que les questions FR sont rédigées en français

Vérifie :
  - Chaque question du fichier est bien rédigée en français (détection via langdetect)
  - Signale les questions détectées comme étant dans une autre langue
  - Tolérance configurable (défaut : score de confiance minimum 0.80)

⚠️  Ce filtre s'applique uniquement aux fichiers lang=fr.
    Il est ignoré silencieusement pour les fichiers lang=en.

Dépendance :
  pip install langdetect

Usage :
  python3 filter_fr_language.py <fichier.json>
  python3 filter_fr_language.py <dossier/>

Retourne :
  exit 0 si toutes les questions sont en français
  exit 1 si questions dans une autre langue détectées
"""

import json
import sys
from pathlib import Path

try:
    from langdetect import LangDetectException, detect, detect_langs

    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False


# ──────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────

MIN_CONFIDENCE = 0.80  # Score de confiance minimum pour considérer la détection fiable
MIN_TEXT_LENGTH = 15  # Ignorer les textes trop courts (peu fiables pour langdetect)
EXPECTED_LANG = "fr"


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────


def load_data(path: Path) -> tuple[list[dict], str]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    questions = data if isinstance(data, list) else data.get("questions", [])
    lang = data.get("lang", "") if isinstance(data, dict) else ""
    return questions, lang


def detect_language(text: str) -> tuple[str, float]:
    """
    Détecte la langue d'un texte.
    Retourne (langue_détectée, score_confiance).
    Retourne ("unknown", 0.0) si la détection échoue ou le texte est trop court.
    """
    if not LANGDETECT_AVAILABLE:
        return "unknown", 0.0

    text = text.strip()
    if len(text) < MIN_TEXT_LENGTH:
        return "skip", 1.0  # Trop court pour être fiable — on ignore

    try:
        langs = detect_langs(text)
        if not langs:
            return "unknown", 0.0
        top = langs[0]
        return top.lang, round(top.prob, 3)
    except LangDetectException:
        return "unknown", 0.0


# ──────────────────────────────────────────────
# Détection
# ──────────────────────────────────────────────


def find_non_french_questions(questions: list[dict]) -> list[dict]:
    """
    Analyse chaque question et retourne celles qui ne semblent pas être en français.
    """
    issues = []

    for q in questions:
        question_text = q.get("question", "").strip()
        if not question_text:
            continue

        detected_lang, confidence = detect_language(question_text)

        # Ignorer les textes trop courts
        if detected_lang == "skip":
            continue

        # Signaler si la langue détectée n'est pas FR avec confiance suffisante
        if detected_lang != EXPECTED_LANG and confidence >= MIN_CONFIDENCE:
            issues.append(
                {
                    "id": q.get("id"),
                    "difficulty": q.get("difficulty"),
                    "question": question_text[:100],
                    "detected_lang": detected_lang,
                    "confidence": confidence,
                }
            )

    return issues


# ──────────────────────────────────────────────
# Affichage
# ──────────────────────────────────────────────


def print_report(path: Path, lang: str, total: int, issues: list[dict]):

    print(f"\n{'═' * 60}")
    print(f"  FR1 — Langue française : {path.name}")
    print(f"{'═' * 60}")

    if lang != "fr":
        print(
            f"  ⏭️  Ignoré — lang='{lang}' (FR1 s'applique uniquement aux fichiers FR)"
        )
        return

    if not LANGDETECT_AVAILABLE:
        print(f"  ⚠️  langdetect non installé — filtre FR1 désactivé")
        print(f"      Installer : pip install langdetect")
        return

    print(f"  Questions analysées : {total}\n")

    if not issues:
        print(f"  ✅ Toutes les questions sont en français")
        return

    print(f"  ❌ {len(issues)} question(s) suspecte(s) (langue ≠ français)\n")

    for item in issues[:15]:
        print(
            f"     [{item['id']}] ({item['difficulty']}) "
            f"détecté: {item['detected_lang']} ({item['confidence'] * 100:.0f}%)"
        )
        print(f"       → {item['question']}")

    if len(issues) > 15:
        print(f"     … et {len(issues) - 15} autre(s)")


# ──────────────────────────────────────────────
# Interface quality_audit.py
# ──────────────────────────────────────────────


def run(path: Path) -> dict:
    """Interface standardisée appelée par quality_audit.py."""
    try:
        questions, lang = load_data(path)
    except Exception as e:
        return {
            "filter": "FR1",
            "name": "Langue française",
            "file": str(path),
            "total_questions": 0,
            "error_count": 1,
            "passed": False,
            "summary": f"Erreur lecture fichier : {e}",
            "details": {},
        }

    if lang != "fr":
        return {
            "filter": "FR1",
            "name": "Langue française",
            "file": str(path),
            "total_questions": len(questions),
            "error_count": 0,
            "passed": True,
            "summary": f"Ignoré (lang={lang})",
            "details": {"skipped": True, "lang": lang},
        }

    if not LANGDETECT_AVAILABLE:
        return {
            "filter": "FR1",
            "name": "Langue française",
            "file": str(path),
            "total_questions": len(questions),
            "error_count": 0,
            "passed": True,
            "summary": "langdetect non installé — filtre ignoré",
            "details": {"skipped": True, "reason": "langdetect_missing"},
        }

    total = len(questions)
    issues = find_non_french_questions(questions)

    return {
        "filter": "FR1",
        "name": "Langue française",
        "file": str(path),
        "total_questions": total,
        "error_count": len(issues),
        "passed": len(issues) == 0,
        "summary": "Toutes les questions en français"
        if not issues
        else f"{len(issues)} question(s) non françaises détectées",
        "details": {
            "lang": lang,
            "issues": issues,
        },
    }


# ──────────────────────────────────────────────
# Entrée principale
# ──────────────────────────────────────────────


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 filter_fr_language.py <fichier.json|dossier/>")
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
            reason = d.get("lang") or d.get("reason", "")
            print(f"\n  FR1 — {path.name} : ⏭️  ignoré ({reason})")
            continue

        print_report(
            path, d.get("lang", ""), result["total_questions"], d.get("issues", [])
        )

        if not result["passed"]:
            has_errors = True

    print(f"\n{'─' * 60}")
    if has_errors:
        print("  ❌ Audit FR1 terminé — questions non françaises détectées")
        sys.exit(1)
    else:
        print("  ✅ Audit FR1 terminé — langue conforme")
        sys.exit(0)


if __name__ == "__main__":
    main()
