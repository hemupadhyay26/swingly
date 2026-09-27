import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { HangingCharacterWidget } from "../src/react";

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

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
        <p>A tiny character that lives on your page and swings gently.</p>
        <div className="hero-actions">
          <a className="gh-btn hero-btn-primary" href="#already-drawn">
            <span>Use Already Generated</span>
            <ChevronDown size={16} />
          </a>
          <a
            className="gh-btn"
            href="https://github.com/hemupadhyay26/swingly"
            target="_blank"
            rel="noreferrer"
            aria-label="View Swingly on GitHub"
          >
            <GitHubMark />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </section>
  );
}
