import { describe, expect, it } from "vitest";
import { ancestors, buildGraph, descendants, findCycles, lineage } from "@/lib/graph";

const rel = (target: string, type: "successor-of" | "derived-from" = "successor-of") => ({ target, type });

// a -> b -> c, b -> d (derived), e unrelated
const models = [
  { id: "a", relations: [] },
  { id: "b", relations: [rel("a")] },
  { id: "c", relations: [rel("b")] },
  { id: "d", relations: [rel("b", "derived-from")] },
  { id: "e", relations: [] },
];

describe("graph", () => {
  const g = buildGraph(models);

  it("builds edges from older to newer model", () => {
    expect(g.edges).toContainEqual({ from: "a", to: "b", type: "successor-of", note: undefined });
    expect(g.children.get("b")?.map((e) => e.to).sort()).toEqual(["c", "d"]);
    expect(g.parents.get("c")?.map((e) => e.from)).toEqual(["b"]);
  });

  it("walks ancestors and descendants transitively", () => {
    expect([...ancestors(g, "c")].sort()).toEqual(["a", "b"]);
    expect([...descendants(g, "a")].sort()).toEqual(["b", "c", "d"]);
  });

  it("lineage excludes siblings' other branches and unrelated models", () => {
    expect([...lineage(g, "c")].sort()).toEqual(["a", "b", "c"]);
    expect(lineage(g, "e")).toEqual(new Set(["e"]));
  });

  it("ignores relations to missing models", () => {
    expect(buildGraph([{ id: "x", relations: [rel("missing")] }]).edges).toEqual([]);
  });

  it("finds cycles", () => {
    expect(findCycles(g)).toEqual([]);
    const cyclic = buildGraph([
      { id: "a", relations: [rel("c")] },
      { id: "b", relations: [rel("a")] },
      { id: "c", relations: [rel("b")] },
    ]);
    const cycles = findCycles(cyclic);
    expect(cycles).toHaveLength(1);
    expect(new Set(cycles[0])).toEqual(new Set(["a", "b", "c"]));
  });
});
