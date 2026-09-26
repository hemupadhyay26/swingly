import { useState } from "react";
import { GitBranch } from "lucide-react";
import { HangingCharacterWidget } from "../src/react";

/**
 * The real swingly package, running live on this page, not a mockup. The character
 * mounts scoped to the title (via `mountTarget`) instead of `document.body`, so it
 * hangs off the "/Swingly" heading itself and scrolls with it, rather than pinning to
 * the browser-window corner.
 */
export function Hero() {
  const [titleEl, setTitleEl] = useState<HTMLDivElement | null>(null);

  return (
    <section className="hero">
      <HangingCharacterWidget
        assets={`${import.meta.env.BASE_URL}characters/panda/manifest.json`}
        mountTarget={titleEl}
        corner="top-right"
        offset={{ x: -10, y: -150 }}
        showThread={false}
        threadLength={24}
        width={120}
      />
      <div className="hero-copy">
        <div className="hero-title-anchor" ref={setTitleEl}>
          <h1>/Swingly</h1>
        </div>
        <p>A tiny character that lives on your page. It swings gently and reacts when you poke it.</p>
        <a
          className="gh-btn"
          href="https://github.com/hemupadhyay26/swingly"
          target="_blank"
          rel="noreferrer"
          aria-label="View Swingly on GitHub"
        >
          <GitBranch size={16} />
          <span>GitHub</span>
        </a>
      </div>
    </section>
  );
}
