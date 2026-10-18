import { Hero } from "./Hero";
import { Gallery } from "./Gallery";
import { ThemeToggle } from "./ThemeToggle";

export function App() {
  return (
    <>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="wordmark" href="#">/swingly<span className="brand-dot" /></a>
        <div className="nav-links"><a href="#already-drawn">Characters</a><a href="https://github.com/hemupadhyay26/swingly" target="_blank" rel="noreferrer">GitHub ↗</a><ThemeToggle /></div>
      </nav>
      <main>
        <Hero />
        <section className="collection" aria-labelledby="collection-title">
          <header id="already-drawn">
            <div><span className="eyebrow">THE COLLECTION</span><h2 id="collection-title">Small characters. Big personality.</h2><p>Find your little companion. Select a character to make it yours.</p></div>
            <span className="collection-note">Ready to meet your webpage ↗</span>
          </header>
          <Gallery />
        </section>
      </main>
      <footer><a className="wordmark" href="#">/swingly</a><span>A little less ordinary. A little more alive.</span><a href="https://github.com/hemupadhyay26/swingly" target="_blank" rel="noreferrer">Made to be played with ↗</a></footer>
    </>
  );
}
