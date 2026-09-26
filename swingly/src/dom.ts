import type { Corner, ExpressionsAsset } from "./types.js";

export function cornerStyles(
  corner: Corner,
  offsetX: number,
  offsetY: number,
  positionMode: "fixed" | "absolute" = "fixed",
): Partial<CSSStyleDeclaration> {
  const styles: Partial<CSSStyleDeclaration> = { position: positionMode };
  const [vertical, horizontal] = corner.split("-") as ["top" | "bottom", "left" | "right"];
  styles[vertical] = `${offsetY}px`;
  styles[horizontal] = `${offsetX}px`;
  return styles;
}

/** CSS background-size/position for showing exactly one cell of a row-major sprite grid. */
export function spriteCellStyle(expressions: ExpressionsAsset, index: number): { backgroundSize: string; backgroundPosition: string } {
  const { rows, cols } = expressions.grid;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const backgroundSize = `${cols * 100}% ${rows * 100}%`;
  const backgroundPosition = `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
  return { backgroundSize, backgroundPosition };
}

export function resolveAssetUrl(baseUrl: string, file: string): string {
  return new URL(file, baseUrl).toString();
}
