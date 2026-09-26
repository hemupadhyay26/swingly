# Swingly

A tiny character that hangs off the corner of a webpage and swings like a pendulum.

Repo: https://github.com/hemupadhyay26/swingly

## What's in this repo

- **`swingly/`** — the actual npm package (`HangingCharacter` class + a React wrapper). Drop a character's `manifest.json` + image in, and it hangs, drags, and swings. Also contains the demo site (`swingly/site`) showing it running live.
- **`skills/page-swingly/`** — a Python CLI (`page-swingly`) that generates new characters via the OpenAI Images API: a `<slug>.png` and the `manifest.json` the library needs. Also has `page-swingly-publish`, which exports those into `swingly/public/characters/` as WEBP.
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
