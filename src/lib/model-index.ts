import type { Model, Organization } from "./schema";

export interface ModelIndexEntry {
  name: string;
  color: string;
  date: string;
}

/** Name, org color and release date for every model, for lineage links. */
export function buildIndex(models: Model[], organizations: Organization[]): Record<string, ModelIndexEntry> {
  const colors = new Map(organizations.map((o) => [o.id, o.color]));
  return Object.fromEntries(
    models.map((m) => [m.id, { name: m.name, color: colors.get(m.org) ?? "#8b9ab3", date: m.releaseDate }]),
  );
}
