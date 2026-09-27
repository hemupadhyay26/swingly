"""Validates every character in characters/ and its published counterpart in
swingly/public/characters/. Used as a CI gate on contribution PRs (see
.github/workflows/validate-characters.yml) so a broken/incomplete character
submission fails automatically instead of needing a human to catch it.
"""

import json
import sys
from pathlib import Path

from PIL import Image

# .../totaka/skills/page-swingly/src/page_swingly/validate.py -> .../totaka
PROJECT_ROOT = Path(__file__).resolve().parents[4]
SOURCE_DIR = PROJECT_ROOT / "characters"
PUBLIC_DIR = PROJECT_ROOT / "swingly" / "public" / "characters"

REQUIRED_MAIN_FIELDS = {"file", "width", "height", "anchorPoint"}


def validate_character(char_dir: Path, errors: list[str], *, require_source_naming: bool) -> None:
    slug = char_dir.name
    manifest_path = char_dir / "manifest.json"
    if not manifest_path.is_file():
        errors.append(f"{slug}: missing manifest.json")
        return

    try:
        manifest = json.loads(manifest_path.read_text())
    except json.JSONDecodeError as e:
        errors.append(f"{slug}: manifest.json is not valid JSON ({e})")
        return

    character = manifest.get("character") or {}
    if not character.get("name") or not character.get("description"):
        errors.append(f'{slug}: manifest.json\'s "character" needs both "name" and "description"')

    main = manifest.get("main")
    if not main:
        errors.append(f'{slug}: manifest.json is missing "main"')
        return

    missing = REQUIRED_MAIN_FIELDS - main.keys()
    if missing:
        errors.append(f'{slug}: manifest.json\'s "main" is missing {sorted(missing)}')

    anchor = main.get("anchorPoint") or {}
    if "x" not in anchor or "y" not in anchor:
        errors.append(f"{slug}: main.anchorPoint needs both x and y")

    image_name = main.get("file")
    if not image_name:
        return

    image_path = char_dir / image_name
    if not image_path.is_file():
        errors.append(f'{slug}: main.file "{image_name}" does not exist in {char_dir}')
        return

    if require_source_naming and image_name != f"{slug}.png":
        errors.append(f'{slug}: source image should be named "{slug}.png", found "{image_name}"')

    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        errors.append(f"{slug}: could not open {image_name} ({e})")
        return

    if main.get("width") != img.width or main.get("height") != img.height:
        errors.append(
            f"{slug}: manifest main.width/height ({main.get('width')}x{main.get('height')}) "
            f"doesn't match the actual image ({img.width}x{img.height})"
        )

    alpha_min, _ = img.getchannel("A").getextrema()
    if alpha_min > 10:
        errors.append(
            f"{slug}: {image_name} doesn't look transparent (minimum alpha value is {alpha_min}) "
            "- background should be transparent, not a solid color"
        )


def main() -> None:
    errors: list[str] = []

    if not SOURCE_DIR.is_dir():
        print("No characters/ directory found - nothing to validate.")
        return

    index_path = SOURCE_DIR / "index.json"
    index_slugs = set(json.loads(index_path.read_text())) if index_path.is_file() else set()

    dir_slugs: set[str] = set()
    for char_dir in sorted(SOURCE_DIR.iterdir()):
        if not char_dir.is_dir():
            continue
        dir_slugs.add(char_dir.name)
        validate_character(char_dir, errors, require_source_naming=True)

        public_dir = PUBLIC_DIR / char_dir.name
        if not public_dir.is_dir():
            errors.append(
                f"{char_dir.name}: not published - run `uv run page-swingly-publish` and commit "
                f"swingly/public/characters/{char_dir.name}/"
            )
        else:
            validate_character(public_dir, errors, require_source_naming=False)

    missing_from_index = dir_slugs - index_slugs
    stale_in_index = index_slugs - dir_slugs
    if missing_from_index:
        errors.append(
            f"characters/index.json is missing {sorted(missing_from_index)} "
            "- run any page-swingly generation to regenerate it"
        )
    if stale_in_index:
        errors.append(f"characters/index.json references folders that don't exist: {sorted(stale_in_index)}")

    if errors:
        print(f"Found {len(errors)} problem(s):\n")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print(f"All {len(dir_slugs)} character(s) look good.")


if __name__ == "__main__":
    main()
