"""Publishes `characters/` (source-of-truth PNGs) into `swingly/public/characters/`
(what the site actually serves), converting each character's image to WEBP.

This is a deliberate second step, separate from generation: `page-swingly` always
outputs PNG (the raw/source asset, good for re-editing), and `swingly/public/characters`
used to be a symlink straight back to that same source directory — fine for a demo,
but it meant the site was always serving unconverted PNGs. Run this whenever you want
the public/served copy to catch up with whatever's currently in `characters/`.
"""

import json
import shutil
from pathlib import Path

from PIL import Image
from .errors import run_cli
from .ui import HelpParser, message, status

# .../totaka/skills/page-swingly/src/page_swingly/publish.py -> .../totaka
PROJECT_ROOT = Path(__file__).resolve().parents[4]
SOURCE_DIR = PROJECT_ROOT / "characters"
DEST_DIR = PROJECT_ROOT / "swingly" / "public" / "characters"


def _convert_image(src: Path, dest: Path) -> tuple[int, int]:
    img = Image.open(src).convert("RGBA")
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="WEBP", lossless=True, method=6)
    return img.size


def _publish_character(char_dir: Path) -> str:
    manifest = json.loads((char_dir / "manifest.json").read_text())
    dest_char_dir = DEST_DIR / char_dir.name
    dest_char_dir.mkdir(parents=True, exist_ok=True)

    for asset_key in ("main", "expressions"):
        asset = manifest.get(asset_key)
        if not asset:
            continue
        src_img = char_dir / asset["file"]
        webp_name = f"{char_dir.name}{'' if asset_key == 'main' else '-expressions'}.webp"
        width, height = _convert_image(src_img, dest_char_dir / webp_name)
        asset["file"] = webp_name
        asset["width"] = width
        asset["height"] = height

    (dest_char_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return char_dir.name


def main() -> None:
    parser = HelpParser(description="Publish character assets to the demo site.")
    parser.add_argument("--debug", action="store_true", help="Show a traceback for troubleshooting.")
    args = parser.parse_args()
    run_cli(_main, debug=args.debug)


def _main() -> None:
    if DEST_DIR.is_symlink() or DEST_DIR.exists():
        if DEST_DIR.is_symlink():
            DEST_DIR.unlink()
        else:
            shutil.rmtree(DEST_DIR)
    DEST_DIR.mkdir(parents=True)

    slugs = []
    for char_dir in sorted(SOURCE_DIR.iterdir()):
        if not char_dir.is_dir() or not (char_dir / "manifest.json").is_file():
            continue
        with status(f"Publishing {char_dir.name}..."):
            slug = _publish_character(char_dir)
        slugs.append(slug)
        message(f"published {slug} -> swingly/public/characters/{slug}/")

    (DEST_DIR / "index.json").write_text(json.dumps(slugs, indent=2))
    message(f"Done. Published {len(slugs)} character(s) to {DEST_DIR}", style="green")


if __name__ == "__main__":
    main()
