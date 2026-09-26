import { useEffect, useState } from "react";

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

function Card({ slug, manifest, index }: CharacterEntry & { index: number }) {
  const name = manifest.character?.name || slug;
  const style = {
    "--swing-duration": `${2.6 + (index % 5) * 0.25}s`,
    "--swing-delay": `${-(index % 4) * 0.35}s`,
  } as React.CSSProperties;

  return (
    <article className="card">
      <div className="card-media">
        {manifest.main?.file && (
          <img src={`${CHARACTERS_DIR}/${slug}/${manifest.main.file}`} alt={name} style={style} />
        )}
        <div className="name-pill">{name}</div>
      </div>
    </article>
  );
}

export function Gallery() {
  const [characters, setCharacters] = useState<CharacterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="grid">
      {characters.map((entry, index) => (
        <Card key={entry.slug} index={index} {...entry} />
      ))}
    </div>
  );
}
