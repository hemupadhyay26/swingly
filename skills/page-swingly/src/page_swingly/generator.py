import base64
import json
from dataclasses import dataclass
from pathlib import Path

from openai import OpenAI
from PIL import Image

from .prompts import main_pose_prompt
from .style import ANCHOR_POINT, ART_STYLE, DEFAULT_MODEL, DEFAULT_QUALITY


@dataclass
class CharacterRequest:
    name: str
    description: str
    out_dir: Path
    size: int = 1024
    model: str = DEFAULT_MODEL
    quality: str = DEFAULT_QUALITY


def _generate_image(client: OpenAI, model: str, prompt: str, size: int, quality: str) -> bytes:
    # Kept as PNG (the API default) on purpose: this is the raw/source generation
    # output, not what ships to the site. Converting to WEBP happens later, only when
    # exporting assets into the public/served location — not here.
    result = client.images.generate(
        model=model,
        prompt=prompt,
        size=f"{size}x{size}",
        background="transparent",
        quality=quality,
        n=1,
    )
    return base64.b64decode(result.data[0].b64_json)


def _save_image(data: bytes, path: Path) -> tuple[int, int]:
    path.write_bytes(data)
    with Image.open(path) as img:
        return img.size


def generate_character(client: OpenAI, request: CharacterRequest) -> Path:
    request.out_dir.mkdir(parents=True, exist_ok=True)

    # Named after the character's own slug (the output directory's name) rather than
    # the generic "main", so the asset file is self-describing on its own — e.g.
    # characters/panda/panda.png instead of characters/panda/main.png.
    main_path = request.out_dir / f"{request.out_dir.name}.png"
    manifest_path = request.out_dir / "manifest.json"

    main_bytes = _generate_image(
        client, request.model,
        main_pose_prompt(request.name, request.description),
        request.size, request.quality,
    )
    main_size = _save_image(main_bytes, main_path)

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
