import {
  MODALITIES,
  MODEL_TYPES,
  OPENNESS,
  type Modality,
  type Model,
  type ModelType,
  type Openness,
} from "./schema";

export interface Filters {
  orgs: string[];
  types: ModelType[];
  modalities: Modality[];
  openness: Openness[];
  /** Inclusive year range. */
  from?: number;
  to?: number;
  /** Hide non-matching models instead of dimming them. */
  hide: boolean;
}

export interface ViewState {
  filters: Filters;
  model?: string;
}

export const EMPTY_FILTERS: Filters = { orgs: [], types: [], modalities: [], openness: [], hide: false };

export function isFiltering(f: Filters): boolean {
  return (
    f.orgs.length > 0 ||
    f.types.length > 0 ||
    f.modalities.length > 0 ||
    f.openness.length > 0 ||
    f.from !== undefined ||
    f.to !== undefined
  );
}

export function matchesFilters(m: Model, f: Filters): boolean {
  if (f.orgs.length && !f.orgs.includes(m.org)) return false;
  if (f.types.length && !f.types.includes(m.type)) return false;
  if (f.openness.length && !f.openness.includes(m.openness)) return false;
  if (f.modalities.length) {
    const all = new Set([...m.modalities.input, ...m.modalities.output]);
    if (!f.modalities.some((x) => all.has(x))) return false;
  }
  const year = Number(m.releaseDate.slice(0, 4));
  if (f.from !== undefined && year < f.from) return false;
  if (f.to !== undefined && year > f.to) return false;
  return true;
}

function list<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[] | Set<string>): T[] {
  const raw = params.get(key);
  if (!raw) return [];
  const ok = (v: string) => (allowed instanceof Set ? allowed.has(v) : (allowed as readonly string[]).includes(v));
  return [...new Set(raw.split(",").filter(ok))] as T[];
}

function year(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  return Number(raw);
}

/** Reads view state from the URL, silently dropping anything unrecognized. */
export function parseViewState(
  params: URLSearchParams,
  known: { orgs: Set<string>; models: Set<string> },
): ViewState {
  const from = year(params, "from");
  let to = year(params, "to");
  if (from !== undefined && to !== undefined && to < from) to = from;
  const model = params.get("model") ?? undefined;
  return {
    filters: {
      orgs: list(params, "org", known.orgs),
      types: list(params, "type", MODEL_TYPES),
      modalities: list(params, "modality", MODALITIES),
      openness: list(params, "open", OPENNESS),
      from,
      to,
      hide: params.get("hide") === "1",
    },
    model: model && known.models.has(model) ? model : undefined,
  };
}

export function serializeViewState(s: ViewState): string {
  const p = new URLSearchParams();
  if (s.model) p.set("model", s.model);
  const f = s.filters;
  if (f.orgs.length) p.set("org", f.orgs.join(","));
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.modalities.length) p.set("modality", f.modalities.join(","));
  if (f.openness.length) p.set("open", f.openness.join(","));
  if (f.from !== undefined) p.set("from", String(f.from));
  if (f.to !== undefined) p.set("to", String(f.to));
  if (f.hide) p.set("hide", "1");
  // Commas are safe in query strings; keep them readable.
  return p.toString().replace(/%2C/g, ",");
}
