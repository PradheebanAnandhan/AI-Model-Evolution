import { dateValue } from "./format";
import type { Dataset, Model } from "./schema";

export interface AtlasStats {
  models: number;
  orgs: number;
  /** Distinct model families, counted per lab. */
  families: number;
  sources: number;
  /** Year of the first release. */
  first: number;
}

export function atlasStats({ models, organizations }: Dataset): AtlasStats {
  return {
    models: models.length,
    orgs: organizations.length,
    families: new Set(models.map((m) => `${m.org}:${m.family}`)).size,
    sources: models.reduce((n, m) => n + m.sources.length, 0),
    first: Math.min(...models.map((m) => Number(m.releaseDate.slice(0, 4)))),
  };
}

/** The most recent release among `ids`. */
export function newestOf(models: Model[], ids: string[]): string | undefined {
  const wanted = new Set(ids);
  let best: Model | undefined;
  for (const m of models) {
    if (wanted.has(m.id) && (!best || dateValue(m.releaseDate) > dateValue(best.releaseDate))) best = m;
  }
  return best?.id;
}
