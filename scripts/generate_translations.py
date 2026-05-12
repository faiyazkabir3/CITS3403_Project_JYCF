# python scripts/generate_translations.py nl ja

import argparse
import json
import re
from pathlib import Path

from google.cloud import translate_v2 as translate

LANG_DIR = Path("static/lang")
SOURCE_LANG = "en"

PLACEHOLDER_PATTERN = re.compile(r"\{[A-Za-z0-9_]+\}")

def protect_placeholders(text: str) -> tuple[str, list[str]]:
    """
    Protects placeholders like {character}, {enemy}, {damage}
    before sending text to Google Translate.

    Example:
      "{character} killed {enemy}."
    becomes:
      "ZXQ0QXZ killed ZXQ1QXZ."
    """
    placeholders = PLACEHOLDER_PATTERN.findall(text)
    protected_text = text

    for index, placeholder in enumerate(placeholders):
        protected_text = protected_text.replace(placeholder, f"ZXQ{index}QXZ", 1)

    return protected_text, placeholders


def restore_placeholders(text: str, placeholders: list[str]) -> str:
    """
    Restores protected placeholders after translation.
    Also repairs older Google-translated placeholder forms like
    __PLAATSHOUDER_0__ and __PLAATSVERVANGER_0__.
    """
    restored = text

    for index, placeholder in enumerate(placeholders):
        restore_candidates = [
            f"ZXQ{index}QXZ",
            f"ZXQ {index} QXZ",
            f"ZXQ{index} QXZ",
            f"ZXQ {index}QXZ",
            f"__PLACEHOLDER_{index}__",
            f"__PLAATSHOUDER_{index}__",
            f"__PLAATSVERVANGER_{index}__",
            f"__プレースホルダー_{index}__",
        ]

        for token in restore_candidates:
            restored = restored.replace(token, placeholder)

    # Safety net: handles any translated placeholder-like token with the same index.
    def replace_translated_placeholder(match: re.Match) -> str:
        index = int(match.group(1))
        if 0 <= index < len(placeholders):
            return placeholders[index]
        return match.group(0)

    restored = re.sub(r"__[A-ZÀ-ÖØ-ÞA-Za-z_\-]+_(\d+)__", replace_translated_placeholder, restored)

    return restored

def load_json(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def save_json(path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

def translate_text(client, text, target_lang):
    protected_text, placeholders = protect_placeholders(text)

    result = client.translate(
        protected_text,
        source_language=SOURCE_LANG,
        target_language=target_lang,
        format_="text",
    )

    translated = result["translatedText"]
    return restore_placeholders(translated, placeholders)

def generate_language(target_lang, overwrite=False):
    client = translate.Client()

    source_path = LANG_DIR / "en.json"
    target_path = LANG_DIR / f"{target_lang}.json"

    source_data = load_json(source_path)
    target_data = load_json(target_path)

    updated = dict(target_data)

    for key, english_text in source_data.items():
        if not overwrite and key in updated:
            continue

        if not isinstance(english_text, str):
            updated[key] = english_text
            continue

        updated[key] = translate_text(client, english_text, target_lang)
        print(f"{key}: {updated[key]}")

    save_json(target_path, updated)
    print(f"Saved {target_path}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("languages", nargs="+", help="Target language codes, e.g. nl fr de es")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing translations")
    args = parser.parse_args()

    for lang in args.languages:
      generate_language(lang, overwrite=args.overwrite)

if __name__ == "__main__":
    main()