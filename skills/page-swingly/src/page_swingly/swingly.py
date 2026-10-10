import os
import re
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from .generator import CharacterRequest, generate_character
from .codex_provider import generate_with_codex
from .errors import UserError, run_cli
from .prompts import main_pose_prompt
from .ui import HelpParser, message, panel, status
from .style import DEFAULT_MODEL, DEFAULT_QUALITY, DEFAULT_SIZE

# .../totaka/skills/page-swingly/src/page_swingly/swingly.py -> .../totaka
PROJECT_ROOT = Path(__file__).resolve().parents[4]
CHARACTERS_DIR = PROJECT_ROOT / "characters"


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "character"


def build_parser() -> HelpParser:
    # Read after load_dotenv() so .env values act as the defaults, while
    # --model / --quality on the CLI still override them for a one-off run.
    default_model = os.environ.get("OPENAI_IMAGE_MODEL", DEFAULT_MODEL)
    default_quality = os.environ.get("OPENAI_IMAGE_QUALITY", DEFAULT_QUALITY)

    parser = HelpParser(
        prog="page-swingly",
        description="Generate a Swingly character asset set (<slug>.png + manifest.json) via the OpenAI Images API.",
    )
    parser.add_argument("--name", required=True, help="Character name, e.g. 'Panda'")
    parser.add_argument("--description", required=True, help="Free-text visual description of the character")
    parser.add_argument("--provider", choices=["api", "codex"], default=os.environ.get("PAGE_SWINGLY_PROVIDER", "api"), help="api: existing API flow; codex: generate with signed-in Codex CLI or import a PNG.")
    parser.add_argument("--image", type=Path, help="PNG generated in Codex; only used with --provider codex.")
    parser.add_argument("--debug", action="store_true", help="Show a traceback for local troubleshooting; may include API details.")
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
    return parser


def main() -> None:
    # Parse within the boundary too, including environment/configuration failures.
    run_cli(_main, debug="--debug" in sys.argv[1:])


def _main() -> None:
    load_dotenv()
    parser = build_parser()
    args = parser.parse_args()
    for field in ("name", "description", "model"):
        if not getattr(args, field).strip():
            parser.error(f"--{field} must not be blank")
    if args.size <= 0:
        parser.error("--size must be positive")

    if args.provider not in {"api", "codex"}:
        parser.error("PAGE_SWINGLY_PROVIDER must be api or codex")
    if args.image and args.provider != "codex":
        parser.error("--image requires --provider codex")
    out_dir = Path(args.out) if args.out else CHARACTERS_DIR / slugify(args.name)

    request = CharacterRequest(
        name=args.name,
        description=args.description,
        out_dir=out_dir,
        size=args.size,
        model=args.model,
        quality=args.quality,
        source_image=args.image,
    )

    panel(f"Character: {request.name}\nProvider: {args.provider}\nOutput: {request.out_dir}", title="Swingly")
    if args.provider == "codex":
        if args.image is not None:
            with status("Importing Codex artwork..."):
                manifest_path = generate_character(None, request)
        else:
            # A fresh isolated output directory avoids importing stale images.
            with tempfile.TemporaryDirectory(prefix="swingly-codex-") as directory:
                with status("Generating artwork with your Codex subscription..."):
                    request.source_image = generate_with_codex(
                        main_pose_prompt(args.name, args.description), Path(directory) / "generated.png", args.size,
                    )
                    manifest_path = generate_character(None, request)
    else:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise UserError("OPENAI_API_KEY is not set. Set it in the environment or a .env file, or use --provider codex for a subscription prompt handoff.")
        with OpenAI(api_key=api_key) as client, status("Generating artwork through OpenAI..."):
            manifest_path = generate_character(client, request)
    message(f"Done. Wrote {out_dir.name}.png, manifest.json to {manifest_path.parent}", style="green")
