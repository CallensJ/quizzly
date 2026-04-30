"""
generate-questions.py
Script générique pour nettoyer (déduplication + rééquilibrage) et compléter
n'importe quelle catégorie de questions jusqu'à un total cible.

Usage:
  python3 scripts/generate-questions.py --category dinosaures --lang fr
  python3 scripts/generate-questions.py --category sport --lang fr --target 900
  python3 scripts/generate-questions.py --category geographie --lang en --target 600 --batch 30

Variables d'environnement:
  ANTHROPIC_API_KEY  (obligatoire)
"""

import json
import argparse
import os
import sys
import random
import re
from collections import Counter
from pathlib import Path

import anthropic

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

LETTERS = ["A", "B", "C", "D"]
SEED = 42

# Haiku pour la génération en masse (rapide + économique pour du contenu texte)
# Remplacer par claude-opus-4-7 pour une qualité maximale
DEFAULT_MODEL = "claude-haiku-4-5"

# Nombre de questions générées par appel API (évite les timeouts)
DEFAULT_BATCH = 25

# ---------------------------------------------------------------------------
# Utilitaires fichiers
# ---------------------------------------------------------------------------

def resolve_path(category: str, lang: str) -> Path:
    """Cherche le fichier JSON de la catégorie dans les dossiers standards."""
    candidates = [
        Path(f"src/data/questions/{lang}/{category}.json"),
        Path(f"src/data/questions/{lang}/{category.replace('-', '_')}.json"),
        Path(f"src/data/questions/{lang}/{category.replace('_', '-')}.json"),
    ]
    for p in candidates:
        if p.exists():
            return p
    raise FileNotFoundError(
        f"Fichier introuvable pour catégorie='{category}' lang='{lang}'. "
        f"Chemins testés: {[str(c) for c in candidates]}"
    )


def load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅  Sauvegardé : {path}")

# ---------------------------------------------------------------------------
# Nettoyage
# ---------------------------------------------------------------------------

def deduplicate(questions: list) -> list:
    """Supprime les doublons basés sur le texte exact de la question (garde le premier)."""
    seen: set = set()
    unique = []
    for q in questions:
        key = q["question"].strip()
        if key not in seen:
            seen.add(key)
            unique.append(q)
    removed = len(questions) - len(unique)
    if removed:
        print(f"  Doublons supprimés : {removed} (restant : {len(unique)})")
    return unique


def rebalance_answers(questions: list, rng: random.Random) -> list:
    """
    Rééquilibre la distribution A/B/C/D en réassignant cycliquement la lettre
    correcte, puis mélange aléatoirement les autres options.
    Ne modifie pas le contenu — seulement la position de la bonne réponse.
    """
    total = len(questions)
    # Quota cible : ~25% chaque lettre
    target = total // 4
    quota = {l: target for l in LETTERS}
    remainder = total - target * 4
    for l in LETTERS[:remainder]:
        quota[l] += 1

    # Trier les questions par difficulté pour un résultat déterministe
    sorted_q = sorted(questions, key=lambda q: (q["difficulty"], q["id"]))

    # Assigner les lettres selon le quota
    assignment = []
    pool = []
    for l in LETTERS:
        pool.extend([l] * quota[l])
    rng.shuffle(pool)

    result = []
    for q, target_letter in zip(sorted_q, pool):
        q2 = dict(q)
        opts = q2["options"]
        correct_text = opts[q2["answer"]]

        other_texts = [v for k, v in opts.items() if k != q2["answer"]]
        rng.shuffle(other_texts)

        new_opts = {}
        for i, l in enumerate(LETTERS):
            if l == target_letter:
                new_opts[l] = correct_text
            else:
                new_opts[l] = other_texts.pop(0)

        q2["options"] = new_opts
        q2["answer"] = target_letter
        result.append(q2)

    return result

# ---------------------------------------------------------------------------
# Analyse
# ---------------------------------------------------------------------------

def analyze(questions: list) -> dict:
    by_diff = {d: [q for q in questions if q["difficulty"] == d]
               for d in ["easy", "medium", "hard"]}
    ans = Counter(q["answer"] for q in questions)
    return {"by_diff": by_diff, "answers": ans}


def print_stats(label: str, questions: list) -> None:
    total = len(questions)
    diff = Counter(q["difficulty"] for q in questions)
    ans = Counter(q["answer"] for q in questions)
    print(f"\n{label} — {total} questions")
    for d in ["easy", "medium", "hard"]:
        print(f"  {d:<8} : {diff[d]:>4}")
    print("  Réponses :")
    for l in LETTERS:
        pct = ans[l] / total * 100 if total else 0
        bar = "█" * int(pct / 2)
        print(f"    {l} : {ans[l]:>4} ({pct:.1f}%) {bar}")

# ---------------------------------------------------------------------------
# Génération via Claude API
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Tu es un expert en création de questions éducatives pour enfants de 6 à 11 ans.
Tu dois générer des questions de quiz au format JSON strict, adaptées à la difficulté demandée.

RÈGLES IMPORTANTES:
- Chaque question doit être unique et ne pas répéter les exemples fournis
- Les questions doivent être précises et pédagogiques
- Une seule bonne réponse parmi les 4 options
- Les distracteurs doivent être plausibles mais clairement incorrects
- Respecter strictement le niveau de difficulté (easy/medium/hard)
- Varier les styles : définition, application, identification, comparaison, etc.
- La bonne réponse doit être répartie équitablement entre A, B, C et D

FORMAT DE SORTIE (JSON uniquement, sans markdown) :
[
  {
    "question": "...",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "answer": "A"
  },
  ...
]"""


def build_user_prompt(
    category: str,
    lang: str,
    difficulty: str,
    count: int,
    examples: list,
    existing_questions: list,
) -> str:
    """Construit le prompt utilisateur pour la génération."""

    # Description du style selon la catégorie/langue
    style_note = ""
    if lang == "en":
        style_note = (
            "STYLE: These are French-language-learning questions using this category as context. "
            "Each question involves a French word or expression related to the topic, "
            "and asks the English-speaking student to translate, identify, or apply it. "
            "Mix question formats: French→English translation, fill-in-the-blank, "
            "cognate recognition, French sentence comprehension."
        )
    else:
        style_note = (
            f"STYLE: Questions en français sur la catégorie '{category}', "
            "adaptées à des enfants de 6 à 11 ans. "
            "Questions variées : identification, définition, vrai/faux reformulé, "
            "comparaison, application pratique."
        )

    difficulty_desc = {
        "easy": "Connaissances de base, vocabulaire simple, faits fondamentaux.",
        "medium": "Concepts intermédiaires, vocabulaire spécialisé, relations entre concepts.",
        "hard": "Terminologie avancée, détails précis, raisonnement analytique.",
    }

    # Exemples de questions existantes (style reference)
    ex_text = json.dumps(
        [{"question": q["question"], "options": q["options"], "answer": q["answer"]}
         for q in examples[:5]],
        ensure_ascii=False,
        indent=2,
    )

    # Questions existantes (pour éviter les doublons)
    existing_texts = [q["question"] for q in existing_questions[-200:]]  # dernières 200
    existing_sample = "\n".join(f"- {t[:80]}" for t in existing_texts[:50])

    prompt = f"""Catégorie : {category} | Langue : {lang} | Difficulté : {difficulty}
{style_note}

Niveau {difficulty.upper()} : {difficulty_desc[difficulty]}

EXEMPLES DU STYLE ATTENDU (ne pas reproduire) :
{ex_text}

QUESTIONS DÉJÀ EXISTANTES (éviter absolument les doublons ou sujets trop proches) :
{existing_sample}

Génère exactement {count} nouvelles questions uniques de difficulté '{difficulty}'.
Assure-toi que la bonne réponse est répartie équitablement entre A, B, C et D.
Réponds UNIQUEMENT avec le tableau JSON, sans markdown, sans explication."""

    return prompt


def parse_json_response(text: str) -> list:
    """Extrait et parse le JSON depuis la réponse Claude."""
    # Nettoyer les balises markdown si présentes
    text = re.sub(r"```(?:json)?\s*", "", text).strip()
    text = re.sub(r"```\s*$", "", text).strip()

    # Chercher le tableau JSON
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        raise ValueError(f"Pas de tableau JSON trouvé dans la réponse:\n{text[:500]}")

    return json.loads(match.group(0))


def validate_question(q: dict, category: str, lang: str, difficulty: str, idx: int) -> dict:
    """Valide et normalise une question générée."""
    if not isinstance(q, dict):
        raise ValueError(f"Question #{idx} n'est pas un dict")
    if "question" not in q or not q["question"].strip():
        raise ValueError(f"Question #{idx} manque le champ 'question'")
    if "options" not in q or not isinstance(q["options"], dict):
        raise ValueError(f"Question #{idx} : options invalides")
    if "answer" not in q or q["answer"] not in LETTERS:
        raise ValueError(f"Question #{idx} : answer invalide '{q.get('answer')}'")

    opts = q["options"]
    if set(opts.keys()) != set(LETTERS):
        raise ValueError(f"Question #{idx} : options incomplètes {set(opts.keys())}")

    return {
        "id": f"PLACEHOLDER_{idx}",
        "category": category,
        "subcategory": None,
        "locale": lang,
        "difficulty": difficulty,
        "question": q["question"].strip(),
        "options": {l: str(opts[l]).strip() for l in LETTERS},
        "answer": q["answer"],
    }


def generate_batch(
    client: anthropic.Anthropic,
    category: str,
    lang: str,
    difficulty: str,
    count: int,
    examples: list,
    existing_questions: list,
    model: str,
) -> list:
    """Génère un batch de questions via l'API Claude (avec streaming)."""
    user_prompt = build_user_prompt(
        category, lang, difficulty, count, examples, existing_questions
    )

    print(f"  → Génération de {count} questions {difficulty} via {model}...")

    full_text = ""
    with client.messages.stream(
        model=model,
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    ) as stream:
        for text in stream.text_stream:
            full_text += text
            print(".", end="", flush=True)
    print()

    raw = parse_json_response(full_text)
    validated = []
    for i, q in enumerate(raw):
        try:
            vq = validate_question(q, category, lang, difficulty, i + 1)
            validated.append(vq)
        except ValueError as e:
            print(f"  ⚠️  Question ignorée : {e}")

    print(f"  ✓ {len(validated)}/{count} questions valides reçues")
    return validated


def generate_missing(
    client: anthropic.Anthropic,
    category: str,
    lang: str,
    existing: list,
    gaps: dict,
    model: str,
    batch_size: int,
) -> list:
    """Génère toutes les questions manquantes par difficulté."""
    all_new = []

    for difficulty in ["easy", "medium", "hard"]:
        needed = gaps.get(difficulty, 0)
        if needed <= 0:
            continue

        existing_for_diff = [q for q in existing if q["difficulty"] == difficulty]
        examples = existing_for_diff[:10] if existing_for_diff else existing[:10]

        print(f"\n  Difficulté '{difficulty}' : {needed} questions à générer")

        generated = []
        attempts = 0
        max_attempts = 5

        while len(generated) < needed and attempts < max_attempts:
            remaining = needed - len(generated)
            batch = min(batch_size, remaining)
            attempts += 1

            try:
                batch_result = generate_batch(
                    client=client,
                    category=category,
                    lang=lang,
                    difficulty=difficulty,
                    count=batch,
                    examples=examples,
                    existing_questions=existing + generated,
                    model=model,
                )
                generated.extend(batch_result)
            except Exception as e:
                print(f"  ⚠️  Erreur batch (tentative {attempts}/{max_attempts}): {e}")

        if len(generated) < needed:
            print(f"  ⚠️  Seulement {len(generated)}/{needed} générées après {max_attempts} tentatives")

        all_new.extend(generated[:needed])

    return all_new

# ---------------------------------------------------------------------------
# Renommage des IDs
# ---------------------------------------------------------------------------

def renumber(questions: list, category: str, lang: str) -> list:
    """Renumérote les IDs séquentiellement."""
    prefix = f"{category[:4]}-{lang}"
    for i, q in enumerate(questions):
        q["id"] = f"{prefix}-{i+1:04d}"
    return questions

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Génère et complète les questions d'une catégorie Erudia."
    )
    parser.add_argument("--category", required=True, help="Nom de la catégorie (ex: dinosaures)")
    parser.add_argument("--lang", required=True, choices=["fr", "en"], help="Langue")
    parser.add_argument("--target", type=int, default=600, help="Nombre total cible (défaut: 600)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Modèle Claude (défaut: {DEFAULT_MODEL})")
    parser.add_argument("--batch", type=int, default=DEFAULT_BATCH, help=f"Questions par appel API (défaut: {DEFAULT_BATCH})")
    parser.add_argument("--no-rebalance", action="store_true", help="Ne pas rééquilibrer les réponses")
    parser.add_argument("--dry-run", action="store_true", help="Analyse seule, sans écriture")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌  Variable d'environnement ANTHROPIC_API_KEY manquante.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    rng = random.Random(SEED)

    # --- Chargement ---
    try:
        path = resolve_path(args.category, args.lang)
    except FileNotFoundError as e:
        print(f"❌  {e}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"Catégorie : {args.category} | Langue : {args.lang} | Cible : {args.target}")
    print(f"Fichier   : {path}")
    print(f"Modèle    : {args.model}")
    print(f"{'='*60}")

    data = load_json(path)
    questions = data.get("questions", [])

    print_stats("AVANT nettoyage", questions)

    # --- Déduplication ---
    print("\n--- Déduplication ---")
    questions = deduplicate(questions)

    # --- Calcul des gaps ---
    per_diff = Counter(q["difficulty"] for q in questions)
    target_per_diff = args.target // 3
    remainder = args.target - target_per_diff * 3

    targets = {
        "easy":   target_per_diff + (1 if remainder > 0 else 0),
        "medium": target_per_diff + (1 if remainder > 1 else 0),
        "hard":   target_per_diff,
    }

    gaps = {d: max(0, targets[d] - per_diff.get(d, 0)) for d in ["easy", "medium", "hard"]}
    total_gap = sum(gaps.values())

    print(f"\n--- Gaps à combler (cible par difficulté : ~{target_per_diff}) ---")
    for d in ["easy", "medium", "hard"]:
        print(f"  {d:<8}: {per_diff.get(d, 0)} existantes → {targets[d]} cibles → {gaps[d]} à générer")
    print(f"  Total à générer : {total_gap}")

    if args.dry_run:
        print("\n[DRY RUN] Arrêt sans modification.")
        return

    # --- Génération ---
    new_questions = []
    if total_gap > 0:
        print("\n--- Génération des questions manquantes ---")
        new_questions = generate_missing(
            client=client,
            category=args.category,
            lang=args.lang,
            existing=questions,
            gaps=gaps,
            model=args.model,
            batch_size=args.batch,
        )
        questions.extend(new_questions)
        print(f"\n  Total après génération : {len(questions)}")
    else:
        print("\n✅  Aucune génération nécessaire.")

    # --- Rééquilibrage des réponses ---
    if not args.no_rebalance:
        print("\n--- Rééquilibrage des réponses A/B/C/D ---")
        questions = rebalance_answers(questions, rng)

    # --- Renommage des IDs ---
    questions = renumber(questions, args.category, args.lang)

    # --- Stats finales ---
    print_stats("APRÈS traitement", questions)

    # --- Sauvegarde ---
    data["questions"] = questions
    if "lang" not in data:
        data["lang"] = args.lang
    if "category" not in data:
        data["category"] = args.category

    save_json(path, data)
    print(f"\n✅  Terminé. {len(questions)} questions sauvegardées.")


if __name__ == "__main__":
    main()
