import argparse
import json
import re
from pathlib import Path

from google.cloud import translate_v2 as translate

LANG_DIR = Path("static/lang")
SOURCE_LANG = "en"

PLACEHOLDER_PATTERN = re.compile(r"\{[a-zA-Z0-9_]+\}")

def load_json(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def save_json(path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

def protect_placeholders(text):
    placeholders = PLACEHOLDER_PATTERN.findall(text)
    protected = text

    for index, placeholder in enumerate(placeholders):
        protected = protected.replace(placeholder, f"__PLACEHOLDER_{index}__")

    return protected, placeholders

def restore_placeholders(text, placeholders):
    restored = text

    for index, placeholder in enumerate(placeholders):
        restored = restored.replace(f"__PLACEHOLDER_{index}__", placeholder)

    return restored

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