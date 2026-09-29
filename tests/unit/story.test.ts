import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANNOTATIONS } from "@/content/annotations";
import { CHAPTERS } from "@/content/story";
import { loadData } from "@/lib/data";
import { buildRibbonData } from "@/lib/ribbon";

const { dataset } = loadData(path.join(process.cwd(), "data"));
const ids = new Set(dataset.models.map((m) => m.id));

describe("story chapters", () => {
  it("only reference models that exist", () => {
    for (const c of CHAPTERS) {
      for (const id of c.models) expect(ids.has(id), `${c.id} -> ${id}`).toBe(true);
    }
  });

  it("are in chronological order with valid windows", () => {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const c = CHAPTERS[i];
      expect(c.from <= c.to, c.id).toBe(true);
      if (i > 0) expect(CHAPTERS[i - 1].to < c.from, c.id).toBe(true);
    }
  });

  it("key models fall inside their chapter's window", () => {
    const byId = new Map(dataset.models.map((m) => [m.id, m]));
    for (const c of CHAPTERS) {
      for (const id of c.models) {
        const month = byId.get(id)!.releaseDate.slice(0, 7);
        expect(month >= c.from && month <= c.to, `${id} (${month}) in ${c.id}`).toBe(true);
      }
    }
  });
});

describe("annotations", () => {
  it("only reference models that exist", () => {
    for (const a of ANNOTATIONS) expect(ids.has(a.model), a.model).toBe(true);
  });
});

describe("ribbon data", () => {
  it("summarizes the dataset", () => {
    const data = buildRibbonData(dataset);
    expect(data.stats.models).toBe(dataset.models.length);
    expect(data.edges.length).toBeGreaterThan(50);
    expect(data.stats.first).toBe(2017);
  });
});
