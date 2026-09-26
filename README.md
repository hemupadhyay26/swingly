# Swingly

A tiny character that hangs off the corner of a webpage, swings like a pendulum, and reacts when you poke it.

Repo: https://github.com/hemupadhyay26/swingly

## What's in this repo

- **`swingly/`** — the actual npm package (`HangingCharacter` class + a React wrapper). Drop a character's `manifest.json` + `main.png` in, and it hangs, drags, swings, and reacts to hover/click. Also contains the demo site (`swingly/site`) showing it running live.
- **`skills/page-swingly/`** — a Python CLI (`page-swingly`) that generates new characters via the OpenAI Images API: a `main.png`, an optional `expressions.png` sprite sheet, and the `manifest.json` the library needs.
- **`characters/`** — the generated character asset sets (one folder per character), served to the demo site at runtime — not baked into any build.

## Quick start

```bash
# generate a character
cd skills/page-swingly
uv sync && cp .env.example .env   # add your OPENAI_API_KEY
uv run page-swingly --name "..." --description "..."

# run the demo site
cd swingly
npm install
npm run dev
```

See `swingly/README.md` for the library's API, and `skills/page-swingly/README.md` for generator options.
