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

**Guidelines that affect whether generation actually succeeds:**

- **Avoid copyrighted/trademarked characters** (Spider-Man, Pokémon, etc.). The OpenAI
  Images API's safety system rejects these outright (`moderation_blocked`), and there's
  no legitimate way to prompt around it — don't try.
- **Avoid "hanging by the neck/head" compositions.** A humanoid or mammal figure
  attached to an overhead line right at its head/neck reliably trips the self-harm
  safety classifier, regardless of how playful the intent is. Attach the thread to
  something the character is *holding* instead (a bamboo stalk, a vine, a pole) — see
  `characters/panda/` or `characters/monkey/` for working examples.
- **Avoid words like "relaxed", "limp", or "hanging below"** in the description, even
  for completely benign subjects — this wording tends to trigger the same classifier.
  Describe an active, secure grip instead (see `characters/sloth/`: "actively gripping"
  worked where "relaxed, hanging below" didn't, for the exact same subject).
- Double-check the output actually has a transparent background before committing. CI
  checks this too, but catching it yourself saves a round trip.

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
