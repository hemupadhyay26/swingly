import base64
import json
from dataclasses import dataclass
from pathlib import Path

from openai import OpenAI
from PIL import Image

from .prompts import expression_sheet_prompt, main_pose_prompt
from .style import ANCHOR_POINT, ART_STYLE, DEFAULT_MODEL, DEFAULT_QUALITY, EXPRESSION_LABELS


@dataclass
class CharacterRequest:
    name: str
    description: str
    out_dir: Path
    size: int = 1024
    model: str = DEFAULT_MODEL
    quality: str = DEFAULT_QUALITY
    include_expressions: bool = True


def _generate_image(client: OpenAI, model: str, prompt: str, size: int, quality: str) -> bytes:
    result = client.images.generate(
        model=model,
        prompt=prompt,
        size=f"{size}x{size}",
        background="transparent",
        quality=quality,
        n=1,
    )
    return base64.b64decode(result.data[0].b64_json)


def _save_png(data: bytes, path: Path) -> tuple[int, int]:
    path.write_bytes(data)
    with Image.open(path) as img:
        return img.size


def generate_character(client: OpenAI, request: CharacterRequest) -> Path:
    request.out_dir.mkdir(parents=True, exist_ok=True)

    main_path = request.out_dir / "main.png"
    manifest_path = request.out_dir / "manifest.json"

    main_bytes = _generate_image(
        client, request.model,
        main_pose_prompt(request.name, request.description),
        request.size, request.quality,
    )
    main_size = _save_png(main_bytes, main_path)

    manifest = {
        "character": {
            "name": request.name,
            "description": request.description,
        },
        "style": ART_STYLE,
        "main": {
            "file": main_path.name,
            "width": main_size[0],
            "height": main_size[1],
            "anchorPoint": ANCHOR_POINT,
        },
    }

    if request.include_expressions:
        expressions_path = request.out_dir / "expressions.png"
        expr_bytes = _generate_image(
            client, request.model,
            expression_sheet_prompt(request.name, request.description),
            request.size, request.quality,
        )
        expr_size = _save_png(expr_bytes, expressions_path)
        manifest["expressions"] = {
            "file": expressions_path.name,
            "width": expr_size[0],
            "height": expr_size[1],
            "grid": {"rows": 3, "cols": 3},
            "map": {label: i for i, label in enumerate(EXPRESSION_LABELS)},
        }

    manifest_path.write_text(json.dumps(manifest, indent=2))
    _update_characters_index(request.out_dir.parent)

    return manifest_path


def _update_characters_index(characters_dir: Path) -> None:
    """Keep characters/index.json in sync with which slugs have a manifest.

    Static hosting (e.g. GitHub Pages) can't list a directory's contents, so
    the site's client-side JS reads this file to know which character
    folders exist before fetching each one's manifest.json.
    """
    slugs = sorted(
        p.name for p in characters_dir.iterdir()
        if p.is_dir() and (p / "manifest.json").is_file()
    )
    (characters_dir / "index.json").write_text(json.dumps(slugs, indent=2))
