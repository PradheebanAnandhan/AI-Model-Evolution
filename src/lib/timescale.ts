import { scaleUtc, type ScaleTime } from "d3-scale";

/**
 * How the timeline spaces years. `calendar` is true time. `activity` gives every year a
 * readable minimum width and shares the rest by how many models came out that year, so the
 * crowded recent years get room and the quiet early ones don't waste it.
 */
export type ScaleMode = "activity" | "calendar";

/** Jan 1 of each year from `first` through `last + 1`: the edges of every year on the axis. */
export function yearBoundaries(first: number, last: number): Date[] {
  return Array.from({ length: last - first + 2 }, (_, i) => new Date(Date.UTC(first + i, 0, 1)));
}

/** Pixel width of each year, summing to `total`. */
export function yearWidths(years: number[], counts: number[], total: number, mode: ScaleMode, minPx = 44): number[] {
  const n = years.length;
  if (mode === "calendar") {
    const days = years.map((y) => (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 864e5);
    const sum = days.reduce((a, b) => a + b, 0);
    return days.map((d) => (total * d) / sum);
  }
  // Never more than 70% of an even share, so a narrow chart still has room to weight.
  const min = Math.min(minPx, (total / n) * 0.7);
  const weights = counts.map((c) => Math.max(0, c));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return years.map(() => total / n);
  return weights.map((w) => min + ((total - min * n) * w) / sum);
}

/**
 * A piecewise-linear time scale over whole years, from the first release's year to the
 * later of the last release and `now`. Within a year, time is linear.
 */
export function buildTimeScale(times: number[], mode: ScaleMode, range: [number, number], now?: number): ScaleTime<number, number> {
  const all = now === undefined ? times : [...times, now];
  const yearOf = (t: number) => new Date(t).getUTCFullYear();
  const first = Math.min(...all.map(yearOf));
  const last = Math.max(...all.map(yearOf));
  const bounds = yearBoundaries(first, last);
  const years = bounds.slice(0, -1).map((b) => b.getUTCFullYear());
  const counts = years.map((y) => times.filter((t) => yearOf(t) === y).length);
  const widths = yearWidths(years, counts, range[1] - range[0], mode);
  const stops = [range[0]];
  for (const w of widths) stops.push(stops[stops.length - 1] + w);
  stops[stops.length - 1] = range[1];
  return scaleUtc().domain(bounds).range(stops);
}
