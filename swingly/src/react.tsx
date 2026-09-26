import { useEffect, useRef } from "react";
import { HangingCharacter } from "./HangingCharacter.js";
import type { HangingCharacterOptions } from "./types.js";

export interface HangingCharacterHandle {
  instance: HangingCharacter | null;
}

/**
 * Mounts a HangingCharacter for the lifetime of the calling component and tears it down
 * on unmount. Mounts into `document.body` by default; pass `mountTarget` to scope it to
 * a specific element instead (e.g. to hang it off a heading rather than the viewport
 * corner). Pass `null` (rather than leaving it `undefined`) while a ref target hasn't
 * attached yet — that skips mounting instead of falling back to `document.body`.
 */
export function useHangingCharacter(
  options: HangingCharacterOptions,
  mountTarget?: HTMLElement | null,
): HangingCharacterHandle {
  const handle = useRef<HangingCharacterHandle>({ instance: null });
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    if (mountTarget === null) return;

    let cancelled = false;
    const instance = new HangingCharacter(options);
    handle.current.instance = instance;

    // `mount()` is async (it awaits the manifest fetch before building any DOM).
    // Under StrictMode's dev-mode mount->cleanup->mount, the cleanup below can
    // run before this resolves, while `instance`'s DOM doesn't exist yet, so
    // `destroy()` at that point is a no-op. Without this guard, the mount then
    // completes anyway once the fetch resolves and appends an orphaned,
    // never-cleaned-up copy alongside the real remounted instance.
    instance.mount(mountTarget ?? document.body).then(() => {
      if (cancelled) instance.destroy();
    });

    return () => {
      cancelled = true;
      instance.destroy();
      handle.current.instance = null;
    };
    // Re-mount whenever the serializable shape of the options changes, or the mount
    // target itself changes (e.g. a ref attaching after first render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey, mountTarget]);

  return handle.current;
}

export type HangingCharacterWidgetProps = HangingCharacterOptions & {
  /** Element to mount into instead of `document.body`. See `useHangingCharacter`. */
  mountTarget?: HTMLElement | null;
};

/** Thin, render-nothing component form of `useHangingCharacter` for JSX-first setups. */
export function HangingCharacterWidget({ mountTarget, ...options }: HangingCharacterWidgetProps): null {
  useHangingCharacter(options, mountTarget);
  return null;
}
