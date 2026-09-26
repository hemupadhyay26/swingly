import { useEffect, useRef } from "react";
import { HangingCharacter } from "./HangingCharacter.js";
import type { HangingCharacterOptions } from "./types.js";

export interface HangingCharacterHandle {
  instance: HangingCharacter | null;
}

/** Mounts a HangingCharacter for the lifetime of the calling component and tears it down on unmount. */
export function useHangingCharacter(options: HangingCharacterOptions): HangingCharacterHandle {
  const handle = useRef<HangingCharacterHandle>({ instance: null });
  const optionsKey = JSON.stringify(options);

  useEffect(() => {
    let cancelled = false;
    const instance = new HangingCharacter(options);
    handle.current.instance = instance;

    // `mount()` is async (it awaits the manifest fetch before building any DOM).
    // Under StrictMode's dev-mode mount->cleanup->mount, the cleanup below can
    // run before this resolves, while `instance`'s DOM doesn't exist yet, so
    // `destroy()` at that point is a no-op. Without this guard, the mount then
    // completes anyway once the fetch resolves and appends an orphaned,
    // never-cleaned-up copy alongside the real remounted instance.
    instance.mount(document.body).then(() => {
      if (cancelled) instance.destroy();
    });

    return () => {
      cancelled = true;
      instance.destroy();
      handle.current.instance = null;
    };
    // Re-mount whenever the serializable shape of the options changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  return handle.current;
}

export type HangingCharacterWidgetProps = HangingCharacterOptions;

/** Thin, render-nothing component form of `useHangingCharacter` for JSX-first setups. */
export function HangingCharacterWidget(props: HangingCharacterWidgetProps): null {
  useHangingCharacter(props);
  return null;
}
