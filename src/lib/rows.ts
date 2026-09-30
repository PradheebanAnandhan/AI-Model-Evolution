import type { Organization } from "./schema";

/** Key of the row that gathers the labs with only a few models. */
export const OTHER_KEY = "group:other";

export interface TimelineRow {
  /** The lab's id, or OTHER_KEY. */
  key: string;
  /**
   * `org`: one lab. `group`: several small labs sharing one row.
   * `header`: the title bar of an expanded group; its labs follow as nested `org` rows.
   */
  kind: "org" | "group" | "header";
  orgs: string[];
  name: string;
  /** Models in the row across the whole dataset (filters don't change it). */
  count: number;
  /** A lab row shown inside an expanded group. */
  nested?: boolean;
}

export interface RowOptions {
  /** Labs with fewer models than this share the "Other labs" row. */
  minOwnRow?: number;
  /** Show the shared row's labs as separate rows under a header. */
  expanded?: boolean;
}

/** One row per major lab, in `order`, then the smaller labs together at the bottom. */
export function buildRows(organizations: Organization[], counts: Map<string, number>, { minOwnRow = 5, expanded = false }: RowOptions = {}): TimelineRow[] {
  const count = (o: Organization) => counts.get(o.id) ?? 0;
  const orgRow = (o: Organization, nested?: boolean): TimelineRow => ({ key: o.id, kind: "org", orgs: [o.id], name: o.name, count: count(o), ...(nested ? { nested } : {}) });

  const withModels = organizations.filter((o) => count(o) > 0);
  const own = withModels.filter((o) => count(o) >= minOwnRow);
  const small = withModels.filter((o) => count(o) < minOwnRow);
  const rows = own.map((o) => orgRow(o));

  if (small.length === 1) {
    rows.push(orgRow(small[0]));
  } else if (small.length > 1) {
    const group = { key: OTHER_KEY, orgs: small.map((o) => o.id), name: "Other labs", count: small.reduce((n, o) => n + count(o), 0) };
    if (expanded) rows.push({ ...group, kind: "header" }, ...small.map((o) => orgRow(o, true)));
    else rows.push({ ...group, kind: "group" });
  }
  return rows;
}
