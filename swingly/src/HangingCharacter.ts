import { Emitter } from "./emitter.js";
import { cornerStyles, resolveAssetUrl, spriteCellStyle } from "./dom.js";
import { isPendulumSettled, stepPendulum, type PendulumState } from "./physics.js";
import type {
  CharacterManifest,
  HangingCharacterEventMap,
  HangingCharacterOptions,
  ReactionValue,
} from "./types.js";

const STYLE_ID = "swingly-styles";
const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

function injectBaseStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .swingly-root { pointer-events: none; }
    .swingly-box { pointer-events: auto; cursor: grab; touch-action: none; }
    .swingly-box.swingly-dragging { cursor: grabbing; }
    .swingly-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background-repeat: no-repeat; }
    .swingly-sprite { opacity: 0; transition: opacity 120ms ease; }
    .swingly-sprite.swingly-visible { opacity: 1; }
    .swingly-main.swingly-hidden { opacity: 0; }
    .swingly-box.swingly-blink { animation: swingly-blink 0.4s ease; }
    @keyframes swingly-blink {
      0%   { transform: scaleY(1); }
      35%  { transform: scaleY(0.2); }
      65%  { transform: scaleY(1.06); }
      100% { transform: scaleY(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .swingly-box.swingly-blink { animation: none; }
    }
  `;
  document.head.appendChild(style);
}

type Mode = "idle" | "dragging" | "settling";

export class HangingCharacter {
  private options: HangingCharacterOptions;
  private emitter = new Emitter<HangingCharacterEventMap>();

  private manifest: CharacterManifest | null = null;
  private baseUrl = "";

  private root: HTMLDivElement | null = null;
  private rotator: HTMLDivElement | null = null;
  private box: HTMLDivElement | null = null;
  private mainImg: HTMLImageElement | null = null;
  private spriteLayer: HTMLDivElement | null = null;
  private thread: HTMLDivElement | null = null;

  private mode: Mode = "idle";
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private idleStart = 0;
  private idlePhase: number;

  private pendulum: PendulumState = { angle: 0, angularVelocity: 0 };
  private dragAngle = 0;
  private dragHistory: { angle: number; time: number }[] = [];
  private pointerDownInfo: { x: number; y: number; time: number } | null = null;

  private currentExpression: string | null = null;
  private cursorTiltDeg = 0;
  private lastAngleRad = 0;

  private dims = { width: 0, height: 0, threadLength: 0, anchorXFraction: 0.5 };
  private mountTarget: HTMLElement = document.body;
  private positionMode: "fixed" | "absolute" = "fixed";

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private waveTimer: ReturnType<typeof setInterval> | null = null;
  private expressionRevertTimer: ReturnType<typeof setTimeout> | null = null;

  private boundOnPointerMove = (event: PointerEvent) => this.onPointerMove(event);
  private boundOnPointerUp = (event: PointerEvent) => this.onPointerUp(event);
  private boundOnWindowMove = (event: PointerEvent) => this.onWindowPointerMove(event);

  constructor(options: HangingCharacterOptions) {
    this.options = options;
    this.idlePhase = Math.random() * Math.PI * 2;
  }

  /**
   * Mounts into `target`. Mounting into `document.body` (the default) pins the
   * character to a corner of the whole viewport (`position: fixed`); mounting into
   * any other element attaches it to that element's own corner instead
   * (`position: absolute`, scoped to that box, scrolling with the page).
   */
  async mount(target: HTMLElement = document.body): Promise<this> {
    injectBaseStyles();
    await this.loadManifest();
    this.buildDom(target);
    this.startLoop();
    if (this.lookAtCursorConfig()) {
      window.addEventListener("pointermove", this.boundOnWindowMove, { passive: true });
    }
    if (this.periodicWaveConfig()) {
      const { everyMs, expression, holdMs } = this.periodicWaveConfig()!;
      this.waveTimer = setInterval(() => this.flashExpression(expression, holdMs), everyMs);
    }
    this.armIdleTimer();
    this.emitter.emit("mount", undefined);
    return this;
  }

  unmount(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener("pointermove", this.boundOnWindowMove);
    window.removeEventListener("pointermove", this.boundOnPointerMove);
    window.removeEventListener("pointerup", this.boundOnPointerUp);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.waveTimer) clearInterval(this.waveTimer);
    if (this.expressionRevertTimer) clearTimeout(this.expressionRevertTimer);
    this.root?.remove();
    this.root = this.rotator = this.box = this.mainImg = this.spriteLayer = this.thread = null;
    this.emitter.emit("unmount", undefined);
  }

  destroy(): void {
    this.unmount();
    this.emitter.clear();
  }

  on<K extends keyof HangingCharacterEventMap>(
    event: K,
    fn: (payload: HangingCharacterEventMap[K]) => void,
  ): () => void {
    return this.emitter.on(event, fn);
  }

  off<K extends keyof HangingCharacterEventMap>(
    event: K,
    fn: (payload: HangingCharacterEventMap[K]) => void,
  ): void {
    this.emitter.off(event, fn);
  }

  getExpression(): string | null {
    return this.currentExpression;
  }

  setExpression(name: string | null): void {
    if (this.expressionRevertTimer) {
      clearTimeout(this.expressionRevertTimer);
      this.expressionRevertTimer = null;
    }
    this.currentExpression = name;
    this.renderExpression();
    this.emitter.emit("expressionchange", { expression: name });
  }

  /** Manually nudge the pendulum, e.g. `char.swing(15)` for a 15deg kick. */
  swing(impulseDeg = 12): void {
    this.pendulum = { angle: impulseDeg * RAD, angularVelocity: 0 };
    this.mode = "settling";
    this.emitter.emit("swingstart", undefined);
  }

  // ---- setup -------------------------------------------------------------

  private async loadManifest(): Promise<void> {
    const { assets, baseUrl } = this.options;
    if (typeof assets === "string") {
      const absoluteManifestUrl = new URL(assets, document.baseURI).toString();
      const res = await fetch(absoluteManifestUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`swingly: failed to load manifest at ${absoluteManifestUrl} (${res.status})`);
      this.manifest = (await res.json()) as CharacterManifest;
      this.baseUrl = baseUrl ?? new URL(".", absoluteManifestUrl).toString();
    } else {
      this.manifest = assets;
      this.baseUrl = baseUrl ?? document.baseURI;
    }
  }

  private buildDom(target: HTMLElement): void {
    const manifest = this.manifest!;
    const { main } = manifest;

    const width = this.options.width ?? 96;
    const height = width * (main.height / main.width);
    const threadLength = this.options.threadLength ?? 140;
    const anchorXPercent = main.anchorPoint.x * 100;
    const anchorYPx = main.anchorPoint.y * height;
    this.dims = { width, height, threadLength, anchorXFraction: main.anchorPoint.x };

    this.mountTarget = target;
    this.positionMode = target === document.body ? "fixed" : "absolute";
    if (this.positionMode === "absolute" && getComputedStyle(target).position === "static") {
      // Give the container a positioning context so the character is scoped to it,
      // not to the next positioned ancestor further up the page.
      target.style.position = "relative";
    }

    const root = document.createElement("div");
    root.className = "swingly-root";
    Object.assign(
      root.style,
      cornerStyles(
        this.options.corner ?? "top-right",
        this.options.offset?.x ?? 24,
        this.options.offset?.y ?? 0,
        this.positionMode,
      ),
    );
    if (this.options.zIndex !== undefined) root.style.zIndex = String(this.options.zIndex);

    const rotator = document.createElement("div");
    rotator.className = "swingly-rotator";
    rotator.style.position = "relative";
    rotator.style.width = `${width}px`;
    rotator.style.height = `${threadLength + height}px`;
    rotator.style.transformOrigin = `${anchorXPercent}% 0`;

    const box = document.createElement("div");
    box.className = "swingly-box";
    box.style.position = "absolute";
    box.style.top = `${threadLength - anchorYPx}px`;
    box.style.left = "0";
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    // Anchor scale (squash/stretch) at the hang point, not the box's center, so
    // stretching elongates it downward from where it's attached.
    box.style.transformOrigin = `${anchorXPercent}% ${main.anchorPoint.y * 100}%`;

    const mainImg = document.createElement("img");
    mainImg.className = "swingly-layer swingly-main";
    mainImg.src = resolveAssetUrl(this.baseUrl, main.file);
    mainImg.alt = manifest.character?.name ?? "character";
    mainImg.draggable = false;

    const spriteLayer = document.createElement("div");
    spriteLayer.className = "swingly-layer swingly-sprite";
    if (manifest.expressions) {
      spriteLayer.style.backgroundImage = `url(${resolveAssetUrl(this.baseUrl, manifest.expressions.file)})`;
    }

    box.append(mainImg, spriteLayer);

    if (this.options.showThread ?? true) {
      const thread = document.createElement("div");
      thread.className = "swingly-thread";
      thread.style.position = "absolute";
      thread.style.top = "0";
      thread.style.left = `${anchorXPercent}%`;
      thread.style.width = `${this.options.threadWidth ?? 2}px`;
      thread.style.height = `${threadLength}px`;
      thread.style.transformOrigin = "50% 0%";
      thread.style.transform = "translateX(-50%)";
      thread.style.background = this.options.threadColor ?? "rgba(60, 45, 20, 0.55)";
      rotator.append(thread);
      this.thread = thread;
    }
    rotator.append(box);
    root.append(rotator);
    target.appendChild(root);

    this.root = root;
    this.rotator = rotator;
    this.box = box;
    this.mainImg = mainImg;
    this.spriteLayer = spriteLayer;

    if (this.options.draggable ?? true) {
      box.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    }
    box.addEventListener("pointerenter", (event) => this.onHoverStart(event as PointerEvent));
    box.addEventListener("pointerleave", () => this.onHoverEnd());
  }

  // ---- animation loop -----------------------------------------------------

  private startLoop(): void {
    this.idleStart = performance.now();
    this.lastFrameTime = this.idleStart;
    const tick = (time: number) => {
      const dt = Math.min((time - this.lastFrameTime) / 1000, 0.05);
      this.lastFrameTime = time;
      this.updateAngle(time, dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private updateAngle(time: number, dt: number): void {
    let angleRad: number;

    if (this.mode === "dragging") {
      angleRad = this.dragAngle;
    } else if (this.mode === "settling") {
      this.pendulum = stepPendulum(this.pendulum, this.physicsConfig(), dt);
      angleRad = this.pendulum.angle;
      if (isPendulumSettled(this.pendulum)) {
        this.mode = "idle";
        this.idleStart = time;
        // Resume idle exactly at angle 0 (where the pendulum just settled) instead of
        // the instance's random idle phase, so there's no visible snap on handoff.
        this.idlePhase = 0;
        this.emitter.emit("swingend", undefined);
      }
    } else {
      const idle = this.idleConfig();
      if (idle) {
        const elapsedSeconds = (time - this.idleStart) / 1000;
        const omega = (2 * Math.PI) / (idle.periodMs / 1000);
        angleRad = idle.amplitudeDeg * RAD * Math.sin(omega * elapsedSeconds + this.idlePhase);
      } else {
        angleRad = 0;
      }
    }

    const angularVelocity = dt > 0 ? (angleRad - this.lastAngleRad) / dt : 0;
    this.lastAngleRad = angleRad;

    if (this.rotator) this.rotator.style.transform = `rotate(${angleRad * DEG}deg)`;
    if (this.box) this.box.style.transform = `rotate(${this.cursorTiltDeg}deg)`;
    if (this.thread) {
      const stretch = this.computeStretch(angularVelocity);
      const scaleX = stretch ? stretch.scaleX.toFixed(4) : "1";
      const scaleY = stretch ? stretch.scaleY.toFixed(4) : "1";
      this.thread.style.transform = `translateX(-50%) scaleX(${scaleX}) scaleY(${scaleY})`;
    }
  }

  private computeStretch(angularVelocity: number): { scaleX: number; scaleY: number } | null {
    const opt = this.options.stretch ?? true;
    if (opt === false) return null;
    const custom = typeof opt === "object" ? opt : {};
    const intensity = custom.intensity ?? 0.28;
    const maxAngularVelocity = custom.maxAngularVelocity ?? 6;
    const t = Math.min(Math.abs(angularVelocity) / maxAngularVelocity, 1);
    const stretch = t * intensity;
    return { scaleX: 1 - stretch * 0.6, scaleY: 1 + stretch };
  }

  private idleConfig(): { amplitudeDeg: number; periodMs: number } | null {
    const opt = this.options.idleSwing ?? true;
    if (opt === false) return null;
    const custom = typeof opt === "object" ? opt : {};
    return { amplitudeDeg: custom.amplitudeDeg ?? 6, periodMs: custom.periodMs ?? 3200 };
  }

  private lookAtCursorConfig(): { maxTiltDeg: number } | null {
    const opt = this.options.lookAtCursor;
    if (!opt) return null;
    const custom = typeof opt === "object" ? opt : {};
    return { maxTiltDeg: custom.maxTiltDeg ?? 8 };
  }

  private periodicWaveConfig(): { everyMs: number; expression: string; holdMs: number } | null {
    const opt = this.options.periodicWave;
    if (!opt) return null;
    const custom = typeof opt === "object" ? opt : {};
    return { everyMs: custom.everyMs ?? 20000, expression: custom.expression ?? "waving", holdMs: custom.holdMs ?? 1400 };
  }

  private physicsConfig() {
    return {
      length: 1,
      gravity: this.options.physics?.gravity ?? 9,
      // Lower than a "snap to rest" damping — this lets each swing bleed off
      // only a fraction of its energy so the motion decays gradually over
      // several real oscillations before settling into the idle sway, rather
      // than dying out after one or two swings.
      damping: this.options.physics?.damping ?? 0.8,
    };
  }

  // ---- pointer / drag ------------------------------------------------------

  /**
   * The un-rotated bounding box the character is positioned against: the viewport
   * when mounted into `document.body` (`position: fixed`), or the mount target's own
   * box otherwise (`position: absolute`). Using the target's `getBoundingClientRect`
   * is safe here (unlike for the rotator) since the container itself never rotates.
   */
  private containerOrigin(): { left: number; top: number; width: number; height: number } {
    if (this.positionMode === "fixed") {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const rect = this.mountTarget.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  /**
   * The page position of the pivot point (top of the thread), computed from layout
   * inputs rather than the rotator's own `getBoundingClientRect`, since that would
   * report the rotated bounding box instead of the fixed pivot the rotation is
   * anchored to.
   */
  private anchorPagePosition(): { x: number; y: number } {
    const { width, height, threadLength, anchorXFraction } = this.dims;
    const offsetX = this.options.offset?.x ?? 24;
    const offsetY = this.options.offset?.y ?? 0;
    const corner = this.options.corner ?? "top-right";
    const origin = this.containerOrigin();
    const left = corner.endsWith("left") ? origin.left + offsetX : origin.left + origin.width - offsetX - width;
    const top = corner.startsWith("top")
      ? origin.top + offsetY
      : origin.top + origin.height - offsetY - threadLength - height;
    return { x: left + anchorXFraction * width, y: top };
  }

  private angleFromPointer(clientX: number, clientY: number): number {
    const anchor = this.anchorPagePosition();
    // Negated: CSS `rotate()` is clockwise-positive, which swings a point hanging
    // straight down toward the LEFT for a positive angle — the opposite of dragging
    // the pointer to the right, so the sign has to flip to track the pointer.
    const dx = anchor.x - clientX;
    const dy = Math.max(clientY - anchor.y, 1);
    const angle = Math.atan2(dx, dy);
    const max = 85 * RAD;
    return Math.max(-max, Math.min(max, angle));
  }

  private onPointerDown(event: PointerEvent): void {
    this.pointerDownInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
    this.mode = "dragging";
    this.dragAngle = this.angleFromPointer(event.clientX, event.clientY);
    this.dragHistory = [{ angle: this.dragAngle, time: performance.now() }];
    this.box?.classList.add("swingly-dragging");
    this.box?.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", this.boundOnPointerMove);
    window.addEventListener("pointerup", this.boundOnPointerUp);
    this.emitter.emit("dragstart", undefined);
    this.resetIdleTimer();
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.mode !== "dragging") return;
    this.dragAngle = this.angleFromPointer(event.clientX, event.clientY);
    this.dragHistory.push({ angle: this.dragAngle, time: performance.now() });
    if (this.dragHistory.length > 5) this.dragHistory.shift();
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.mode !== "dragging") return;
    window.removeEventListener("pointermove", this.boundOnPointerMove);
    window.removeEventListener("pointerup", this.boundOnPointerUp);
    this.box?.classList.remove("swingly-dragging");

    const first = this.dragHistory[0];
    const last = this.dragHistory[this.dragHistory.length - 1];
    const dt = Math.max((last.time - first.time) / 1000, 1 / 60);
    const angularVelocity = this.dragHistory.length > 1 ? (last.angle - first.angle) / dt : 0;

    this.pendulum = { angle: this.dragAngle, angularVelocity };
    this.mode = "settling";
    this.emitter.emit("dragend", undefined);
    this.emitter.emit("swingstart", undefined);

    this.handlePossibleClick(event);
  }

  private handlePossibleClick(event: PointerEvent): void {
    const down = this.pointerDownInfo;
    this.pointerDownInfo = null;
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    const elapsed = performance.now() - down.time;
    if (moved > 8 || elapsed > 500) return;

    this.emitter.emit("click", event);
    if (this.options.clickBlink ?? true) this.blink();
    this.resetIdleTimer();
    this.applyReaction(this.options.reactions?.click, true);
  }

  private onHoverStart(event: PointerEvent): void {
    this.resetIdleTimer();
    this.emitter.emit("hover", event);
    this.applyReaction(this.options.reactions?.hover, false);
  }

  private onHoverEnd(): void {
    if (this.options.reactions?.hover) this.setExpression(null);
  }

  private onWindowPointerMove(event: PointerEvent): void {
    const config = this.lookAtCursorConfig();
    if (!config || !this.box) return;
    const rect = this.box.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const normalized = (event.clientX - centerX) / (window.innerWidth / 2);
    const clamped = Math.max(-1, Math.min(1, normalized));
    this.cursorTiltDeg = clamped * config.maxTiltDeg;
  }

  // ---- expressions & reactions ---------------------------------------------

  private applyReaction(value: ReactionValue | "random" | undefined, autoRevert: boolean): void {
    if (!value) return;
    const expressionMap = this.manifest?.expressions?.map ?? {};
    const names = Object.keys(expressionMap);
    if (!names.length) return;

    if (value === "random") {
      this.flashExpression(names[Math.floor(Math.random() * names.length)], 1200);
      return;
    }
    if (typeof value === "string") {
      if (autoRevert) this.flashExpression(value, 1200);
      else this.setExpression(value);
      return;
    }
    if (autoRevert || value.holdMs) this.flashExpression(value.expression, value.holdMs ?? 1200);
    else this.setExpression(value.expression);
  }

  private flashExpression(name: string, holdMs: number): void {
    this.setExpression(name);
    this.expressionRevertTimer = setTimeout(() => this.setExpression(null), holdMs);
  }

  private renderExpression(): void {
    const expressions = this.manifest?.expressions;
    if (!this.mainImg || !this.spriteLayer) return;
    if (!expressions || this.currentExpression === null || !(this.currentExpression in expressions.map)) {
      this.mainImg.classList.remove("swingly-hidden");
      this.spriteLayer.classList.remove("swingly-visible");
      return;
    }
    const index = expressions.map[this.currentExpression];
    const { backgroundSize, backgroundPosition } = spriteCellStyle(expressions, index);
    this.spriteLayer.style.backgroundSize = backgroundSize;
    this.spriteLayer.style.backgroundPosition = backgroundPosition;
    this.mainImg.classList.add("swingly-hidden");
    this.spriteLayer.classList.add("swingly-visible");
  }

  private blink(): void {
    if (!this.box) return;
    this.box.classList.remove("swingly-blink");
    void this.box.offsetWidth;
    this.box.classList.add("swingly-blink");
  }

  // ---- idle reaction ---------------------------------------------------------

  private armIdleTimer(): void {
    const idleMs = this.options.idleTimeoutMs ?? 15000;
    const reaction = this.options.reactions?.idle;
    if (!reaction) return;
    this.idleTimer = setTimeout(() => this.applyReaction(reaction, false), idleMs);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.currentExpression !== null) this.setExpression(null);
    this.armIdleTimer();
  }
}
