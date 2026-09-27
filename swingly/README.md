# swingly

A tiny character that hangs off the corner of your page, swings like a pendulum, and
responds with real physics when you drag and release it. Framework-agnostic core, with
a thin React wrapper included.

This package is asset-driven: point it at a `manifest.json` produced by
[`skills/page-swingly`](../skills/page-swingly) (or any manifest matching the same shape)
and it renders, drags, and swings — no per-character code required. If the manifest
also includes an optional `expressions` sprite sheet, hover/click/idle reactions layer
on top automatically (see "What it does" below) — but this isn't something
`page-swingly` currently generates, so it's opt-in via a hand-made manifest.

## Install

```bash
npm install swingly
```

## Usage (vanilla JS)

```js
import { HangingCharacter } from "swingly";

const char = new HangingCharacter({
  assets: "/characters/panda/manifest.json",
  corner: "top-right",
  threadLength: 140,
});

await char.mount(document.body);
char.on("dragend", () => console.log("released - now settling like a pendulum"));
```

## Usage (React)

```tsx
import { HangingCharacterWidget } from "swingly/react";

function App() {
  return (
    <HangingCharacterWidget
      assets="/characters/panda/manifest.json"
      corner="top-right"
    />
  );
}
```

Or use the `useHangingCharacter` hook directly if you need the instance (e.g. to call
`setExpression` from elsewhere in your component tree).

## What it does

- **Hanging placement** — attaches to a configurable corner of the viewport via a
  dynamically drawn thread down to the character's anchor point (from the manifest).
- **Pendulum physics** — a subtle idle sway at rest, and a real damped-pendulum
  simulation when you drag the character and let go (momentum + damping, not a linear
  tween).
- **Expression swapping** — reads the manifest's 3×3 expression sprite sheet (if
  present) and swaps to a named expression, either imperatively (`setExpression`) or via
  declarative `reactions` (hover / click / idle-timeout).
- **Behavior hooks** — optional periodic wave, optional look-at-cursor tilt, and a
  `swing()` method to nudge the pendulum programmatically.
- **Events** — `mount`, `unmount`, `hover`, `click`, `dragstart`, `dragend`,
  `expressionchange`, `swingstart`, `swingend` via `char.on(event, handler)`.

Characters without an `expressions` block in their manifest still hang and swing —
`setExpression` becomes a no-op for them instead of erroring, so v1 hand-made asset sets
(main art only) work fine.

## Options

```ts
new HangingCharacter({
  assets: string | CharacterManifest, // manifest URL or a pre-loaded manifest object
  baseUrl?: string,                    // override where relative asset files resolve from
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right", // default "top-right"
  offset?: { x?: number; y?: number },
  threadLength?: number,                // px, default 140
  threadColor?: string,
  threadWidth?: number,
  width?: number,                       // rendered character width in px, default 96
  idleSwing?: boolean | { amplitudeDeg?: number; periodMs?: number },
  draggable?: boolean,                  // default true
  physics?: { gravity?: number; damping?: number },
  lookAtCursor?: boolean | { maxTiltDeg?: number },
  periodicWave?: boolean | { everyMs?: number; expression?: string; holdMs?: number },
  reactions?: {
    hover?: string | { expression: string; holdMs?: number };
    click?: string | { expression: string; holdMs?: number } | "random";
    idle?: string | { expression: string; holdMs?: number };
  },
  idleTimeoutMs?: number,               // default 15000
  zIndex?: number,
});
```

## Manifest shape

```json
{
  "character": { "name": "Panda", "description": "..." },
  "main": {
    "file": "panda.png",
    "width": 1024,
    "height": 1024,
    "anchorPoint": { "x": 0.5, "y": 0.05 }
  }
}
```

`main.file` can be any image format/filename the browser can render — the runtime
just resolves it against `baseUrl`, it never assumes a specific name or extension.
`page-swingly` currently outputs `<slug>.png`; a served/deployed copy may convert that
to WEBP as a separate export step, which needs no runtime code change since the
manifest just points at whatever file actually exists. An optional `expressions`
block (3x3 sprite sheet + label→index map) is also supported for characters that have
one, but `page-swingly` doesn't currently generate one — see its README for why.

## Local development

```bash
npm install
npm run build       # emits dist/ (ESM + CJS + .d.ts) via tsup
npm run typecheck
```

```bash
npm run dev          # Vite dev server for site/, a live demo against public/characters
npm run build:site   # builds site/ to site-build/ (what .github/workflows/pages.yml deploys)
npm run preview      # serve that build locally to sanity-check it before deploying
```
