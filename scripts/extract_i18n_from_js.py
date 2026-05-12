# --------------------------------------------
# USAGE EXAMPLES
# --------------------------------------------
#
# General pattern:
# python scripts/extract_i18n_from_js.py <js_file> <prefix> --mode <mode> [--write] [--entries-only]
#
#
# 1. Preview tutorialGuide.js entries only
#    Does not change any files.
# python scripts/extract_i18n_from_js.py static/js/tutorialGuide.js tutorial --mode default
#
# 2. Extract tutorialGuide.js entries and rewrite text fields to t("key")
#    Updates en.json and rewrites tutorialGuide.js.
# python scripts/extract_i18n_from_js.py static/js/tutorialGuide.js tutorial --mode default --write
#
#
# 3. Preview levels.js entries
#    Does not change any files.
# python scripts/extract_i18n_from_js.py static/js/levels.js levels --mode levels
#
# 4. Extract levels.js entries and add fieldKey entries
#    Updates en.json and rewrites levels.js with titleKey/descriptionKey/etc.
# python scripts/extract_i18n_from_js.py static/js/levels.js levels --mode levels --write
#
#
# 5. Preview shop entries from combat-engine.js
#    Does not change any files.
# python scripts/extract_i18n_from_js.py static/js/combat-engine.js shop --mode shop
#
# 6. Extract shop entries into en.json only
#    Safe option for combat-engine.js. Does NOT rewrite combat-engine.js.
# python scripts/extract_i18n_from_js.py static/js/combat-engine.js shop --mode shop --write --entries-only
#
# 7. Extract shop entries and rewrite combat-engine.js
#    Not recommended because combat-engine.js is fragile.
# python scripts/extract_i18n_from_js.py static/js/combat-engine.js shop --mode shop --write
#
#
# 8. Preview any other JS file using default mode
# python scripts/extract_i18n_from_js.py static/js/<file-name>.js <prefix> --mode default
#
# 9. Write any other JS file using default mode
#    Updates en.json and rewrites safe fields to t("key").
# python scripts/extract_i18n_from_js.py static/js/<file-name>.js <prefix> --mode default --write
#
#
# Recommended workflow:
# 1. Run preview command first.
# 2. Check that generated keys look correct.
# 3. Use --write only after preview looks safe.
# 4. Use --entries-only for fragile files like combat-engine.js.
# 5. Run git diff after writing.
#
# Useful checks:
# git diff static/lang/en.json
# git diff static/js/tutorialGuide.js
# git diff static/js/levels.js
# git diff static/js/combat-engine.js
#
# JSON validity check:
# python -m json.tool static/lang/en.json > /dev/null
#
# After adding new en.json entries, regenerate other languages:
# python scripts/generate_translations.py nl ja
#
# If you intentionally want to overwrite existing generated translations:
# python scripts/generate_translations.py nl ja --overwrite
# 
# For tutorialGuide.js → default mode with --write is okay.
# For levels.js → levels mode with --write is okay.
# For combat-engine.js shop entries → shop mode with --write --entries-only is safest.
# --------------------------------------------

import argparse
import json
import re
from pathlib import Path

EN_JSON_PATH = Path("static/lang/en.json")

# Only extract these user-facing property names.
# Do NOT extract ids, action keys, storage keys, button ids, etc.
SAFE_TEXT_FIELDS = [
    "text",
    "message",
    "label",
    "title",
    "placeholder",
    "ariaLabel",
    "description",
    "introText",
    "completeText",
    "resourceLine"
]

FIELD_PATTERN = re.compile(
    r'(?P<field>' + "|".join(SAFE_TEXT_FIELDS) + r')\s*:\s*"(?P<text>[^"\n]+)"'
)


def kebab_to_camel(value: str) -> str:
    parts = re.split(r"[-_\s]+", value.strip())
    if not parts:
        return "text"

    first = parts[0].lower()
    rest = [part[:1].upper() + part[1:] for part in parts[1:] if part]
    return first + "".join(rest)


def text_to_key_suffix(text: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", text)
    if not words:
        return "text"

    words = words[:6]
    first = words[0].lower()
    rest = [word[:1].upper() + word[1:] for word in words[1:]]
    return first + "".join(rest)


def sanitise_key_part(value: str) -> str:
    """
    Keeps level ids like:
    1, 2, 3, 4a, 5b, 6d

    Also makes unusual ids safer if needed.
    """
    value = value.strip()
    value = re.sub(r"[^A-Za-z0-9_-]+", "", value)
    return value or "unknown"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}

    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def find_nearby_id(js_source: str, match_start: int) -> str | None:
    """
    Generic mode:
    Looks backwards near the text field for something like:
      id: "heavy-grenade"
    """
    context = js_source[max(0, match_start - 300):match_start]
    matches = list(re.finditer(r'id\s*:\s*"(?P<id>[^"]+)"', context))
    if not matches:
        return None

    return matches[-1].group("id")


def find_level_id(js_source: str, match_start: int) -> str | None:
    """
    Levels mode:
    Looks backwards for the most recent level id.

    This is designed for objects like:
      {
        id: "4a",
        label: "...",
        description: "...",
        introText: "...",
        completeText: "..."
      }

    It intentionally looks further back than the generic mode because level
    objects can contain several fields.
    """
    context = js_source[max(0, match_start - 1200):match_start]
    matches = list(re.finditer(r'id\s*:\s*"(?P<id>[^"]+)"', context))

    if not matches:
        return None

    return matches[-1].group("id")


def build_default_key(prefix: str, field: str, text: str, nearby_id: str | None) -> str:
    """
    Default mode:
    Good for tutorialGuide.js where cue ids are meaningful:
      id: "heavy-grenade",
      text: "Heavy zombie ahead..."
    becomes:
      tutorial.heavyGrenade
    """
    if nearby_id:
        return f"{prefix}.{kebab_to_camel(nearby_id)}"

    return f"{prefix}.{field}.{text_to_key_suffix(text)}"


def build_levels_key(prefix: str, field: str, text: str, level_id: str | None) -> str:
    safe_level_id = sanitise_key_part(level_id) if level_id else "unknown"

    level_text_fields = {
        "title",
        "description",
        "text",
        "label",
        "message",
        "ariaLabel",
        "placeholder",
    }

    # Unknown completeText appears multiple times, so it needs a suffix.
    if safe_level_id == "unknown":
        return f"{prefix}.{safe_level_id}.{field}.{text_to_key_suffix(text)}"

    # These fields can repeat inside the same level/route.
    if field in level_text_fields:
        return f"{prefix}.{safe_level_id}.{field}.{text_to_key_suffix(text)}"

    # Fields like introText and completeText are usually unique when the level id is known.
    return f"{prefix}.{safe_level_id}.{field}"

def shop_id_to_key_part(item_id: str | None) -> str:
    if not item_id:
        return "unknown"

    item_id = item_id.strip()

    # Preserve existing camelCase ids like pistolAmmo, rifleAmmo, shieldRepair.
    if re.match(r"^[A-Za-z][A-Za-z0-9]*$", item_id):
        return item_id

    # Convert kebab/snake ids if they ever appear.
    return kebab_to_camel(item_id)

def build_shop_key(prefix: str, field: str, text: str, item_id: str | None) -> str:
    safe_item_id = shop_id_to_key_part(item_id) if item_id else text_to_key_suffix(text)
    return f"{prefix}.item.{safe_item_id}.{field}"

def build_key(prefix: str, field: str, text: str, nearby_id: str | None, mode: str) -> str:
    if mode == "levels":
        return build_levels_key(prefix, field, text, nearby_id)
    if mode == "shop":
        return build_shop_key(prefix, field, text, nearby_id)

    return build_default_key(prefix, field, text, nearby_id)


def ensure_import(js_source: str) -> str:
    import_line = 'import { t } from "./translation.js";'

    if 'from "./translation.js"' in js_source or "from './translation.js'" in js_source:
        return js_source

    return import_line + "\n" + js_source


def should_skip_text(text: str) -> bool:
    stripped = text.strip()

    # Skip obvious internal-looking values.
    if stripped in {"true", "false"}:
        return True

    # Skip empty strings.
    if not stripped:
        return True

    return False

def has_existing_key_field(js_source: str, match_end: int, field: str) -> bool:
    """
    Checks shortly after a matched field to see if the matching fieldKey already exists.
    Example:
      title: "First Cut",
      titleKey: "levels.1.title.firstCut"
    """
    context = js_source[match_end:match_end + 120]
    return re.search(rf'\b{re.escape(field)}Key\s*:', context) is not None

def extract_and_rewrite(js_path: Path, prefix: str, write: bool, mode: str, entries_only: bool) -> None:
    js_source = js_path.read_text(encoding="utf-8")
    en_data = load_json(EN_JSON_PATH)

    replacements = []
    added = 0
    duplicate_key_warnings = {}

    for match in FIELD_PATTERN.finditer(js_source):
        field = match.group("field")
        text = match.group("text")

        if should_skip_text(text):
            continue

        if mode == "levels" and has_existing_key_field(js_source, match.end(), field):
            continue

        if mode == "levels":
            nearby_id = find_level_id(js_source, match.start())
        else:
            nearby_id = find_nearby_id(js_source, match.start())

        key = build_key(prefix, field, text, nearby_id, mode)

        # Warn if one generated key maps to different source texts.
        if key in duplicate_key_warnings and duplicate_key_warnings[key] != text:
            print(
                f"\nWARNING: Duplicate generated key with different text:\n"
                f"  Key: {key}\n"
                f"  First: {duplicate_key_warnings[key]}\n"
                f"  New:   {text}\n"
                f"  This usually means the extractor needs a more specific key rule."
            )
        else:
            duplicate_key_warnings[key] = text

        if key not in en_data:
            en_data[key] = text
            added += 1
        elif en_data[key] != text:
            print(
                f"\nWARNING: Existing en.json value differs:\n"
                f"  Key:      {key}\n"
                f"  en.json:  {en_data[key]}\n"
                f"  JS text:  {text}\n"
                f"  Keeping existing en.json value."
            )

        old_fragment = match.group(0)

        if mode == "levels":
            new_fragment = f'{field}: "{text}",\n    {field}Key: "{key}"'
        else:
            new_fragment = f'{field}: t("{key}")'

        replacements.append((old_fragment, new_fragment, key, text))

    print(f"\nScanning: {js_path}")
    print(f"Prefix: {prefix}")
    print(f"Mode: {mode}")

    if not replacements:
        print("No safe static JS text fields found.")
        return

    print("\nFound entries:")
    for _, _, key, text in replacements:
        print(f'  "{key}": "{text}"')

    if not write:
        print("\nPreview only. Add --write to update en.json and rewrite the JS file.")
        return

    save_json(EN_JSON_PATH, en_data)

    if entries_only:
        print(f"\nUpdated {EN_JSON_PATH}")
        print("Entries-only mode. JS file was not rewritten.")
        print(f"Added {added} new en.json entries.")
        return

    new_js_source = js_source

    for old_fragment, new_fragment, _, _ in replacements:
        new_js_source = new_js_source.replace(old_fragment, new_fragment, 1)

    if mode != "levels":
        new_js_source = ensure_import(new_js_source)

    js_path.write_text(new_js_source, encoding="utf-8")

    print(f"\nUpdated {EN_JSON_PATH}")
    print(f"Updated {js_path}")
    print(f"Added {added} new en.json entries.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("js_file", help="Path to JS file, e.g. static/js/tutorialGuide.js")
    parser.add_argument("prefix", help="Translation key prefix, e.g. tutorial or levels")
    parser.add_argument(
        "--mode",
        choices=["default", "levels", "shop"],
        default="default",
        help="Extraction mode. Use --mode levels for static/js/levels.js",
    )
    parser.add_argument("--write", action="store_true", help="Actually update en.json and rewrite JS")
    parser.add_argument(
        "--entries-only",
        action="store_true",
        help="Only update en.json. Do not rewrite the JS file."
    )

    args = parser.parse_args()

    extract_and_rewrite(
        js_path=Path(args.js_file),
        prefix=args.prefix,
        write=args.write,
        mode=args.mode,
        entries_only=args.entries_only,
    )


if __name__ == "__main__":
    main()