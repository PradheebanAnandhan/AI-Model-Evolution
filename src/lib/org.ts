import type { Organization } from "./schema";

/** The letters on a lab's badge: short names are kept whole ("xAI", "TII"), others give their initial. */
export function monogram(org: Pick<Organization, "name" | "shortName">): string {
  const name = (org.shortName ?? org.name).trim();
  return name.length <= 3 ? name : name[0].toUpperCase();
}
