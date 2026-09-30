import { describe, expect, it } from "vitest";
import { buildRows, OTHER_KEY } from "@/lib/rows";
import type { Organization } from "@/lib/schema";

const org = (id: string, order: number): Organization => ({ id, name: id.toUpperCase(), color: "#ffffff", country: "US", website: "https://example.com", order });
const orgs = [org("big", 1), org("mid", 2), org("tiny", 3), org("small", 4), org("none", 5)];
const counts = new Map([
  ["big", 20],
  ["mid", 5],
  ["tiny", 1],
  ["small", 3],
]);

describe("buildRows", () => {
  it("gives large labs their own rows and groups the rest at the bottom", () => {
    const rows = buildRows(orgs, counts, { minOwnRow: 5 });
    expect(rows.map((r) => [r.key, r.kind])).toEqual([
      ["big", "org"],
      ["mid", "org"],
      [OTHER_KEY, "group"],
    ]);
    expect(rows[2]).toMatchObject({ orgs: ["tiny", "small"], count: 4 });
  });

  it("expands the group into a header and one nested row per lab", () => {
    const rows = buildRows(orgs, counts, { minOwnRow: 5, expanded: true });
    expect(rows.map((r) => [r.key, r.kind, r.nested ?? false])).toEqual([
      ["big", "org", false],
      ["mid", "org", false],
      [OTHER_KEY, "header", false],
      ["tiny", "org", true],
      ["small", "org", true],
    ]);
  });

  it("doesn't group a single small lab", () => {
    const rows = buildRows(orgs, new Map([["big", 9], ["tiny", 1]]), { minOwnRow: 5 });
    expect(rows.map((r) => r.key)).toEqual(["big", "tiny"]);
  });

  it("leaves out labs without models", () => {
    expect(buildRows(orgs, counts).some((r) => r.orgs.includes("none"))).toBe(false);
  });
});
