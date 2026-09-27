import { Prism, type PrismTheme } from "prism-react-renderer";

// prism-react-renderer's bundled Prism doesn't include a bash grammar (only
// jsx/tsx and a handful of others ship by default). The setup guide only ever
// shows a single `npm install ...` line, so a full grammar isn't worth
// pulling in `prismjs` as a real dependency for - this minimal one covers it.
Prism.languages.bash = {
  comment: /#.*/,
  string: { pattern: /(["'])(?:\\[\s\S]|(?!\1)[^\\])*\1/, greedy: true },
  parameter: /(^|\s)-{1,2}[\w-]+/,
  command: /^[\w.-]+/,
};

// Custom palette (not a stock Prism theme) tuned to sit on the site's fixed
// dark --code-bg surface in both light and dark mode.
export const codeTheme: PrismTheme = {
  plain: {
    color: "#F0ECE2",
  },
  styles: [
    { types: ["comment"], style: { color: "#8A8776", fontStyle: "italic" } },
    { types: ["punctuation"], style: { color: "#B8B5A9" } },
    { types: ["tag", "keyword"], style: { color: "#E3B778" } },
    { types: ["attr-name", "property", "parameter"], style: { color: "#9CAE7C" } },
    { types: ["string", "attr-value"], style: { color: "#E8A599" } },
    { types: ["function", "command", "builtin"], style: { color: "#8FB3D9" } },
    { types: ["operator"], style: { color: "#B8B5A9" } },
  ],
};
