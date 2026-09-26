export interface AnchorPoint {
  /** Normalized 0-1 horizontal position on the main image. */
  x: number;
  /** Normalized 0-1 vertical position on the main image. */
  y: number;
}

export interface MainAsset {
  file: string;
  width: number;
  height: number;
  anchorPoint: AnchorPoint;
}

export interface ExpressionsAsset {
  file: string;
  width: number;
  height: number;
  grid: { rows: number; cols: number };
  /** Expression name -> row-major cell index into the grid. */
  map: Record<string, number>;
}

/** Matches the manifest.json contract produced by skills/page-swingly. */
export interface CharacterManifest {
  character: { name: string; description?: string };
  style?: string;
  main: MainAsset;
  expressions?: ExpressionsAsset;
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type ReactionValue = string | { expression: string; holdMs?: number };

export interface HangingCharacterOptions {
  /** URL to a manifest.json, or an already-loaded manifest object. */
  assets: string | CharacterManifest;
  /**
   * Base URL that `main.file` / `expressions.file` are resolved against.
   * Defaults to the directory of `assets` when `assets` is a URL string.
   */
  baseUrl?: string;
  /**
   * Which corner it hangs from. Relative to the viewport when mounted into
   * `document.body` (the default), or to the mount target's own box otherwise.
   * Default "top-right".
   */
  corner?: Corner;
  /** Pixel offset from that corner. */
  offset?: { x?: number; y?: number };
  /** Length in pixels of the thread between the page anchor and the character. Default 140. */
  threadLength?: number;
  threadColor?: string;
  threadWidth?: number;
  /** Whether to draw the thread at all — `false` shows just the character image. Default true. */
  showThread?: boolean;
  /** Rendered width in pixels of the character art (height follows the asset's aspect ratio). Default 96. */
  width?: number;
  /** Idle sway animation. `true` uses defaults; pass an object to tune it; `false` disables it. */
  idleSwing?: boolean | { amplitudeDeg?: number; periodMs?: number };
  /** Whether dragging the character and releasing it produces a damped pendulum swing. Default true. */
  draggable?: boolean;
  /** Whether a click plays the little squash/blink animation. Default true. */
  clickBlink?: boolean;
  /** Damped-pendulum tuning for the drag-release swing. */
  physics?: { gravity?: number; damping?: number };
  /** Subtle tilt toward the cursor, layered on top of the swing. */
  lookAtCursor?: boolean | { maxTiltDeg?: number };
  /** Elastic stretch of the thread (not the character) proportional to how fast it's currently swinging. Default true. */
  stretch?: boolean | { intensity?: number; maxAngularVelocity?: number };
  /** Periodically flash an expression (e.g. a wave) even with no interaction. */
  periodicWave?: boolean | { everyMs?: number; expression?: string; holdMs?: number };
  /** Declarative reaction triggers driven by interaction. */
  reactions?: {
    hover?: ReactionValue;
    click?: ReactionValue | "random";
    idle?: ReactionValue;
  };
  /** How long with no interaction before the `idle` reaction fires. Default 15000. */
  idleTimeoutMs?: number;
  zIndex?: number;
}

export type HangingCharacterEventMap = {
  mount: void;
  unmount: void;
  click: PointerEvent;
  hover: PointerEvent;
  dragstart: void;
  dragend: void;
  expressionchange: { expression: string | null };
  swingstart: void;
  swingend: void;
};
