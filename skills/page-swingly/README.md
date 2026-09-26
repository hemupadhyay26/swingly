# page-swingly

Generates a Swingly character asset set — `<slug>.png` (hanging pose) and
`manifest.json` — using the OpenAI Images API.

## Setup

```bash
uv sync
cp .env.example .env   # then put your real OPENAI_API_KEY in .env
```

## Usage

```bash
uv run page-swingly \
  --name "Panda" \
  --description "chubby panda cub, big black eye patches, gripping a bamboo stalk"
```

By default this writes to `<project root>/characters/<slugified-name>/` (e.g.
`characters/panda/`) so every generated character lands in one place at the root
of the project. Pass `--out <dir>` to override the location.

Avoid recognizable copyrighted/trademarked characters (e.g. "Spider-Man") as
`--name`/`--description` input — the OpenAI Images API's safety system rejects those
outright (`moderation_blocked`), and there's no legitimate way to prompt around it.

The entry point lives in `src/page_swingly/swingly.py` — that's the starting point of
the project's generation pipeline.

Outputs `<slug>.png` (e.g. `panda.png`) and `manifest.json` into that directory,
following the asset contract described in `../../.claude/PRD.md` (Sections 3.1 and
6.1):

- `<slug>.png` — character in a hanging pose, transparent background, anchor point at
  normalized `(0.5, 0.05)` for the runtime's dynamically-drawn thread. Kept as PNG on
  purpose — this is the raw/source generation output. Converting to WEBP is a separate
  step done later, only when exporting assets to wherever they're actually served
  from, not part of generation itself.
- `manifest.json` — machine-readable description of the main image for the Swingly
  NPM package to consume directly.

Expression-sheet generation (a 3x3 sprite of mood variants) was tried and removed:
independent/edited generations couldn't reliably match the main pose's exact scale —
the model kept "zooming in" to fill each grid cell, so the sheet never lined up
cleanly with the main pose at runtime. `HangingCharacter` already treats `expressions`
as optional, so characters without it just hang and swing with no face-swapping.

## Publishing to the site

`characters/` is the source of truth (PNG, good for re-editing) — it isn't what the
demo site serves directly. Run this whenever you want the site's public assets to
catch up with whatever's currently in `characters/`:

```bash
uv run page-swingly-publish
```

This converts each character's PNG to WEBP (lossless) and writes the result into
`swingly/public/characters/<slug>/`, along with a copy of `manifest.json` pointing at
the new `.webp` file. The entry point lives in `src/page_swingly/publish.py`.
