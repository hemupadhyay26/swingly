# Contributing a character

Thanks for wanting to add a character to Swingly. Here's the process.

## 1. Generate it

From `skills/page-swingly/`:

```bash
uv sync && cp .env.example .env   # add your OPENAI_API_KEY (skip if already set up)
uv run page-swingly --name "Your Character" --description "..."
```

This writes `characters/<slug>/<slug>.png` and `characters/<slug>/manifest.json`, and
updates `characters/index.json` automatically.

**Generation guidelines:**

- Prefer original character concepts and descriptions you have permission to use.
  An API moderation rejection does not establish that copyright was the cause.
- For animals or humanoids, describe an active grip on a suitable prop or accessory.
  For charms and objects, describe their natural loop or fastening. The generator
  adapts the connector to the subject without forcing a face or limbs onto objects.
- Keep the description focused on the subject, materials, colors, and pose;
  the planned art style and composition remain fixed.
- CI checks transparency, and the optional Codex import checks it before saving.
  Preview the silhouette and attachment point before contributing.
- Failures show a short explanation and next step. Add `--debug` for local
  troubleshooting, and review debug output for sensitive details before sharing.

## 2. Publish it

```bash
uv run page-swingly-publish
```

This converts every character's PNG to WEBP and writes the result into
`swingly/public/characters/` — what the demo site actually serves. Run it even if you
only touched one character; it re-processes the full set and is safe to run repeatedly.

## 3. Preview it locally (recommended)

```bash
cd swingly
npm install
npm run dev
```

Confirm your character shows up in the gallery and hangs/swings correctly before
opening a PR.

## 4. Open a PR

Include both:
- `characters/<slug>/` — the source PNG + manifest
- `swingly/public/characters/<slug>/` — the published WEBP + manifest

(and the regenerated `index.json` in each of those two directories, which the scripts
above already update for you).

### What has to pass before it can be merged

A required CI check, **"Validate character contributions"**, runs automatically on any
PR touching `characters/` or `swingly/public/characters/`. It fails the PR if:

- `manifest.json` is missing, malformed, or missing required fields (`character.name`,
  `character.description`, `main.file`, `main.width`, `main.height`, `main.anchorPoint`)
- the image file the manifest points to doesn't exist, or its dimensions don't match
  what's declared in the manifest
- the image doesn't actually have a transparent background
- the character exists in `characters/` but was never published to
  `swingly/public/characters/` (i.e. you forgot step 2)
- `characters/index.json` is out of sync with what's actually in the folder

You can run the same check yourself before pushing:

```bash
cd skills/page-swingly
uv run page-swingly-validate
```

Passing this check is required, but doesn't guarantee a merge on its own — every PR
still needs a maintainer review and approval.
