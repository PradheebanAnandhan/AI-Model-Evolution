import type { Parameters } from "./schema";

export type DatePrecision = "year" | "month" | "day";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function datePrecision(date: string): DatePrecision {
  const parts = date.split("-").length;
  return parts === 1 ? "year" : parts === 2 ? "month" : "day";
}

/**
 * Position of a partial date on the timeline. Imprecise dates sit in the
 * middle of their period so they are never drawn earlier than they could be.
 */
export function dateValue(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (m === undefined) return new Date(Date.UTC(y, 6, 1));
  if (d === undefined) return new Date(Date.UTC(y, m - 1, 15));
  return new Date(Date.UTC(y, m - 1, d));
}

/** Earliest instant a partial date can refer to; used for ordering checks. */
export function dateStart(date: string): Date {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Latest instant a partial date can refer to. */
export function dateEnd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (m === undefined) return new Date(Date.UTC(y, 11, 31));
  if (d === undefined) return new Date(Date.UTC(y, m, 0));
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (m === undefined) return String(y);
  if (d === undefined) return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatCount(n: number): string {
  if (n >= 1e12) return `${trim(n / 1e12)}T`;
  if (n >= 1e9) return `${trim(n / 1e9)}B`;
  if (n >= 1e6) return `${trim(n / 1e6)}M`;
  if (n >= 1e3) return `${trim(n / 1e3)}K`;
  return String(n);
}

function trim(x: number): string {
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1).replace(/\.0$/, "") : x.toFixed(2).replace(/\.?0+$/, "");
}

export function formatParameters(p: Parameters): string {
  if (!p.disclosed || p.total === undefined) return "Undisclosed";
  const total = formatCount(p.total);
  return p.active ? `${total} total · ${formatCount(p.active)} active` : total;
}

/** Context windows as people quote them: 8,192 -> "8K", 1,048,576 -> "1M", 128,000 -> "128K". */
export function formatTokens(n: number): string {
  if (n >= 1e6 && n % 1e6 === 0) return `${n / 1e6}M`;
  if (n >= 2 ** 20 && n % 2 ** 20 === 0) return `${n / 2 ** 20}M`;
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000}K`;
  if (n >= 1024 && n % 1024 === 0) return `${n / 1024}K`;
  return n.toLocaleString("en-US");
}

export const OPENNESS_LABEL = {
  closed: "Closed",
  "open-weights": "Open weights",
  "open-source": "Open source",
} as const;

export const TYPE_LABEL = {
  llm: "Language model",
  reasoning: "Reasoning model",
  multimodal: "Multimodal",
  image: "Image generation",
  video: "Video generation",
  audio: "Audio / speech",
  embedding: "Embedding",
  code: "Code",
} as const;

export const RELATION_LABEL = {
  "successor-of": { forward: "Successor of", backward: "Succeeded by" },
  "derived-from": { forward: "Derived from", backward: "Basis for" },
  "distilled-from": { forward: "Distilled from", backward: "Distilled into" },
  "inspired-by": { forward: "Builds on", backward: "Influenced" },
} as const;
