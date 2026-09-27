import { useEffect, useState } from "react";
import { Check, Copy, Download, Plus } from "lucide-react";

// Resolved against Vite's configured `base` (defaults to "/"), so this keeps
// working if the site ever gets deployed under a subpath (e.g. GitHub Pages
// project sites). `public/characters` is what actually serves these files.
const CHARACTERS_DIR = `${import.meta.env.BASE_URL}characters`;

interface Manifest {
  character?: { name?: string; description?: string };
  main?: { file: string };
}

interface CharacterEntry {
  slug: string;
  manifest: Manifest;
}

function Card({ slug, manifest, index, onOpen }: CharacterEntry & { index: number; onOpen: () => void }) {
  const name = manifest.character?.name || slug;
  const style = {
    "--swing-duration": `${2.6 + (index % 5) * 0.25}s`,
    "--swing-delay": `${-(index % 4) * 0.35}s`,
  } as React.CSSProperties;

  return (
    <article className="card">
      <button type="button" className="card-media card-media-btn" onClick={onOpen} aria-label={`Open ${name}`}>
        {manifest.main?.file && (
          <img src={`${CHARACTERS_DIR}/${slug}/${manifest.main.file}`} alt={name} style={style} />
        )}
        <div className="name-pill">{name}</div>
      </button>
    </article>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access can fail (permissions, insecure context) - not worth surfacing
    }
  };

  return (
    <div className="code-block">
      <pre>
        <code>{code}</code>
      </pre>
      <button
        type="button"
        className="code-block-copy"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy to clipboard"}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function DownloadPanel({ entry, onClose }: { entry: CharacterEntry; onClose: () => void }) {
  const name = entry.manifest.character?.name || entry.slug;
  const file = entry.manifest.main?.file;
  const imageUrl = file ? `${CHARACTERS_DIR}/${entry.slug}/${file}` : null;
  const manifestUrl = `${CHARACTERS_DIR}/${entry.slug}/manifest.json`;
  const assetsPath = `/characters/${entry.slug}/manifest.json`;

  return (
    <div className="download-backdrop" onClick={onClose}>
      <aside className="download-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="download-panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {imageUrl && (
          <div className="download-panel-preview">
            <img src={imageUrl} alt={name} />
          </div>
        )}
        <h3 className="download-panel-name">{name}</h3>
        {imageUrl && (
          <a className="gh-btn download-panel-btn" href={imageUrl} download={file}>
            <Download size={16} />
            <span>Download .{file?.split(".").pop()?.toLowerCase()}</span>
          </a>
        )}

        <ol className="setup-guide">
          <li>
            <span>Install swingly</span>
            <CodeBlock code="npm install swingly" />
          </li>
          <li>
            <span>
              Download the{" "}
              <a href={imageUrl ?? "#"} download={file}>
                image
              </a>{" "}
              and the{" "}
              <a href={manifestUrl} download="manifest.json">
                manifest.json
              </a>{" "}
              into <code>public/characters/{entry.slug}/</code> in your project
            </span>
          </li>
          <li>
            <span>Mount it</span>
            <CodeBlock code={`<HangingCharacterWidget\n  assets="${assetsPath}"\n  corner="top-right"\n/>`} />
          </li>
        </ol>
      </aside>
    </div>
  );
}

export function Gallery() {
  const [characters, setCharacters] = useState<CharacterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CharacterEntry | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const indexRes = await fetch(`${CHARACTERS_DIR}/index.json`, { cache: "no-store" });
        if (!indexRes.ok) throw new Error(`index.json ${indexRes.status}`);
        const slugs: string[] = await indexRes.json();

        const entries = await Promise.all(
          slugs.map(async (slug): Promise<CharacterEntry | null> => {
            const res = await fetch(`${CHARACTERS_DIR}/${slug}/manifest.json`, { cache: "no-store" });
            if (!res.ok) return null;
            const manifest = await res.json();
            return { slug, manifest };
          }),
        );

        if (!cancelled) setCharacters(entries.filter((e): e is CharacterEntry => e !== null));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="grid">
        <p className="status">Couldn't load characters/index.json ({error}). Generate a character first, or check the path.</p>
      </div>
    );
  }

  if (characters === null) {
    return (
      <div className="grid">
        <p className="status">Loading characters…</p>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="grid">
        <p className="status">No characters generated yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid">
        {characters.map((entry, index) => (
          <Card key={entry.slug} index={index} {...entry} onOpen={() => setSelected(entry)} />
        ))}
        <a
          className="card contribute-card"
          href="https://github.com/hemupadhyay26/swingly/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noreferrer"
        >
          <div className="contribute-card-media">
            <Plus size={28} />
            <div className="contribute-tooltip">Contribute your creation</div>
          </div>
        </a>
      </div>
      {selected && <DownloadPanel entry={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
