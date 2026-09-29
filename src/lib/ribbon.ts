import { dateValue } from "./format";
import type { Dataset } from "./schema";

export interface RibbonModel {
  id: string;
  name: string;
  org: string;
  /** Release date as epoch ms. */
  t: number;
  color: string;
}

export interface RibbonData {
  models: RibbonModel[];
  orgs: { id: string; name: string; shortName?: string; color: string }[];
  edges: { from: string; to: string }[];
  stats: { models: number; orgs: number; links: number; sources: number; first: number; last: number };
}

/** A compact, serializable slice of the dataset for the landing page's client components. */
export function buildRibbonData({ models, organizations }: Dataset): RibbonData {
  const colors = new Map(organizations.map((o) => [o.id, o.color]));
  const ids = new Set(models.map((m) => m.id));
  const edges = models.flatMap((m) => m.relations.filter((r) => ids.has(r.target)).map((r) => ({ from: r.target, to: m.id })));
  const years = models.map((m) => Number(m.releaseDate.slice(0, 4)));
  return {
    models: models.map((m) => ({ id: m.id, name: m.name, org: m.org, t: dateValue(m.releaseDate).getTime(), color: colors.get(m.org) ?? "#8b9ab3" })),
    orgs: organizations.map((o) => ({ id: o.id, name: o.name, shortName: o.shortName, color: o.color })),
    edges,
    stats: {
      models: models.length,
      orgs: organizations.length,
      links: edges.length,
      sources: models.reduce((n, m) => n + m.sources.length, 0),
      first: Math.min(...years),
      last: Math.max(...years),
    },
  };
}
