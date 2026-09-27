# Swingly

A tiny character that hangs off the corner of a webpage and swings like a pendulum.

Repo: https://github.com/hemupadhyay26/swingly
Live demo: https://hemupadhyay26.github.io/swingly/

## What's in this repo

- **`swingly/`** — the actual npm package (`HangingCharacter` class + a React wrapper). Drop a character's `manifest.json` + image in, and it hangs, drags, and swings. Also contains the demo site (`swingly/site`) showing it running live.
- **`skills/page-swingly/`** — a Python CLI (`page-swingly`) that generates new characters via the OpenAI Images API: a `<slug>.png` and the `manifest.json` the library needs. Also has `page-swingly-publish`, which exports those into `swingly/public/characters/` as WEBP.
- **`characters/`** — the generated character asset sets (one folder per character) — the source of truth (PNG). Not what the demo site serves directly; run `page-swingly-publish` to push updates to `swingly/public/characters/`.
- **`.github/workflows/`** — CI: `pages.yml` builds and deploys the demo site to GitHub Pages on every push to `main`; `publish.yml` publishes the `swingly` npm package whenever a `vX.Y.Z` tag is pushed.

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

See `swingly/README.md` for the library's API, and `skills/page-swingly/README.md` for
generator options.

## Releasing the npm package

`swingly/README.md` ships inside the published npm tarball, so maintainer-only info
like this stays here instead. Releases are handled by
[`.github/workflows/publish.yml`](.github/workflows/publish.yml), not a local
`npm publish`. To cut a release, push a tag matching `v*.*.*` from the repo root:

```bash
git tag v1.0.1
git push origin v1.0.1
```

The tag name is the source of truth for the published version — CI sets it just before
publishing, so `swingly/package.json`'s committed version doesn't need to match.
Requires an `NPM_TOKEN` repo secret (an npm token that doesn't require a 2FA
one-time password for CI, e.g. an "Automation" token) under **Settings → Secrets and
variables → Actions**.
