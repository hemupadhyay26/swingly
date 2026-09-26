import argparse
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from .generator import CharacterRequest, generate_character
from .style import DEFAULT_MODEL, DEFAULT_QUALITY, DEFAULT_SIZE

# .../totaka/skills/page-swingly/src/page_swingly/swingly.py -> .../totaka
PROJECT_ROOT = Path(__file__).resolve().parents[4]
CHARACTERS_DIR = PROJECT_ROOT / "characters"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "character"


def build_parser() -> argparse.ArgumentParser:
    # Read after load_dotenv() so .env values act as the defaults, while
    # --model / --quality on the CLI still override them for a one-off run.
    default_model = os.environ.get("OPENAI_IMAGE_MODEL", DEFAULT_MODEL)
    default_quality = os.environ.get("OPENAI_IMAGE_QUALITY", DEFAULT_QUALITY)

    parser = argparse.ArgumentParser(
        prog="page-swingly",
        description="Generate a Swingly character asset set (main.png + expressions.png + manifest.json) via the OpenAI Images API.",
    )
    parser.add_argument("--name", required=True, help="Character name, e.g. 'Spider-Man'")
    parser.add_argument("--description", required=True, help="Free-text visual description of the character")
    parser.add_argument(
        "--out",
        default=None,
        help=f"Output directory (default: {CHARACTERS_DIR}/<character-name>)",
    )
    parser.add_argument("--size", type=int, default=DEFAULT_SIZE, help=f"Square canvas size in pixels (default {DEFAULT_SIZE})")
    parser.add_argument(
        "--model",
        default=default_model,
        help=f"OpenAI image model to use (default: {default_model}, from OPENAI_IMAGE_MODEL if set)",
    )
    parser.add_argument(
        "--quality",
        default=default_quality,
        choices=["low", "medium", "high"],
        help=f"Image quality tier (default: {default_quality}, from OPENAI_IMAGE_QUALITY if set)",
    )
    parser.add_argument(
        "--skip-expressions",
        action="store_true",
        help="Only generate main.png (skip the 3x3 expressions.png sheet)",
    )
    return parser


def main() -> None:
    load_dotenv()

    args = build_parser().parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY is not set (set it in the environment or a .env file).", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out) if args.out else CHARACTERS_DIR / slugify(args.name)

    client = OpenAI(api_key=api_key)
    request = CharacterRequest(
        name=args.name,
        description=args.description,
        out_dir=out_dir,
        size=args.size,
        model=args.model,
        quality=args.quality,
        include_expressions=not args.skip_expressions,
    )

    print(f"Generating '{request.name}' -> {request.out_dir}")
    manifest_path = generate_character(client, request)
    written = "main.png, manifest.json" if args.skip_expressions else "main.png, expressions.png, manifest.json"
    print(f"Done. Wrote {written} to {manifest_path.parent}")
