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

The prompt preserves the planned artwork structure: the existing cartoon style,
75% visible cord, independent character scale, allowed edge cropping, transparent
background, and shared anchor point. Additional wording clarifies appropriate grips
and fastenings for different subjects without changing those constraints.

Prefer original subjects and descriptions you have permission to use. A moderation
rejection does not establish that copyright was the cause. All three commands show
short error messages with a next step, plus API error identifiers when available.
Use `--debug` for a local traceback; review it before sharing API details.

## API keys or a Codex subscription

The default `api` provider keeps the existing OpenAI Images API workflow and its
model/quality configuration. API usage has separate billing from ChatGPT Pro.

Set `PAGE_SWINGLY_PROVIDER=codex` in `.env`, or pass `--provider codex`, to
run the installed Codex CLI's built-in image generator and import its PNG in one step.
Install Codex in the same shell where you run this command and sign in with ChatGPT
using `codex login`. Set `PAGE_SWINGLY_CODEX_BIN` if the executable is not on PATH.

```bash
uv run page-swingly --provider codex --name "Panda" --description "panda gripping bamboo"
```

This checks ChatGPT login, runs Codex in an isolated temporary directory with a
workspace-write sandbox, then imports its transparent PNG into the unchanged asset
pipeline. The art prompt and manifest contract remain the same. No API key is passed
to Codex; no paid API fallback or retry of refusals is attempted. The built-in image
tool must be available in your Codex CLI session. This integration is covered by
mocked tests; actual generation depends on CLI availability and subscription limits.

Use `--image /path/to/image.png`
to import an existing transparent PNG. Model and quality flags configure only API
requests; Codex uses its available built-in controls. See
[authentication](https://learn.chatgpt.com/docs/auth) and
[image usage and pricing](https://learn.chatgpt.com/docs/pricing).

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

## Terminal interface

The existing commands use Rich for prompt panels, generation/import/publish spinners,
colored success messages, and concise error panels on stderr. Redirected output stays
plain, without animations or terminal controls. Names and descriptions are rendered
literally, including square brackets. Existing flags, composition, output, and provider
behavior stay the same. No additional interactive questions are required.

Run `uv sync` after updating to install Rich, then use your usual commands.
