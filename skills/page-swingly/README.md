# page-swingly

Generates a Swingly character asset set — `main.png` (hanging pose), `expressions.png`
(3x3 sprite sheet of 9 expressions), and `manifest.json` — using the OpenAI Images API.

## Setup

```bash
uv sync
cp .env.example .env   # then put your real OPENAI_API_KEY in .env
```

## Usage

```bash
uv run page-swingly \
  --name "Spider-Man" \
  --description "red-and-blue suit, athletic build, classic web-patterned mask and costume"
```

By default this writes to `<project root>/characters/<slugified-name>/` (e.g.
`characters/spider-man/`) so every generated character lands in one place at the root
of the project. Pass `--out <dir>` to override the location.

The entry point lives in `src/page_swingly/swingly.py` — that's the starting point of
the project's generation pipeline.

Outputs `main.png`, `expressions.png`, and `manifest.json` into that directory,
following the asset contract described in `../../.claude/PRD.md` (Sections 3.1 and 6.1):

- `main.png` — character in a hanging pose, transparent background, anchor point at
  normalized `(0.5, 0.05)` for the runtime's dynamically-drawn thread.
- `expressions.png` — 3x3 grid, row-major order: `hi, happy, love, surprise, cool,
  confused, sleepy, charming, waving`.
- `manifest.json` — machine-readable description of both files for the Swingly NPM
  package to consume directly.
