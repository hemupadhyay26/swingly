import { Hero } from "./Hero";
import { Gallery } from "./Gallery";

export function App() {
  return (
    <>
      <Hero />
      <header id="already-drawn">
        <h2>Already drawn</h2>
        <p>
          Live gallery, read straight from <code>/characters/</code> at load time. No build step for the data.
        </p>
      </header>
      <Gallery />
    </>
  );
}
