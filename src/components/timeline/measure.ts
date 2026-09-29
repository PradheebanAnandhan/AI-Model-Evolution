// Measures label widths with the real UI font, so direct labels are placed exactly.
let ctx: CanvasRenderingContext2D | null = null;
let family = "";
const cache = new Map<string, number>();

/** Call once fonts have loaded; earlier measurements used fallback metrics. */
export function resetMeasureCache() {
  cache.clear();
  family = "";
}

export function measureLabel(text: string, size = 12, weight = 500): number {
  const key = `${weight}|${size}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === "undefined") return text.length * size * 0.56;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.56;
  family ||= getComputedStyle(document.body).fontFamily;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = Math.ceil(ctx.measureText(text).width);
  cache.set(key, w);
  return w;
}
