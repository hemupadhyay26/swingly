import { Hero } from "./Hero";
import { Gallery } from "./Gallery";

export function App() {
  return (
    <>
      <Hero />
      <header id="already-drawn">
        <h2>Already drawn</h2>
        <p>Pick one of these ready-to-use characters and try it on your own site.</p>
      </header>
      <Gallery />
    </>
  );
}
