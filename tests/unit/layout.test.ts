import { describe, expect, it } from "vitest";
import { layoutLanes, packRows } from "@/lib/layout";

describe("packRows", () => {
  it("keeps non-overlapping intervals on one row", () => {
    const { rows, count } = packRows([
      { id: "a", start: 0, end: 10 },
      { id: "b", start: 20, end: 30 },
    ]);
    expect(count).toBe(1);
    expect(rows.get("b")).toBe(0);
  });

  it("stacks overlapping intervals and reuses freed rows", () => {
    const { rows, count } = packRows(
      [
        { id: "a", start: 0, end: 50 },
        { id: "b", start: 10, end: 40 },
        { id: "c", start: 45, end: 60 },
        { id: "d", start: 70, end: 80 },
      ],
      2,
    );
    expect(rows.get("a")).toBe(0);
    expect(rows.get("b")).toBe(1);
    expect(rows.get("c")).toBe(1); // b ends at 40 (+2 gap) before c starts at 45
    expect(rows.get("d")).toBe(0);
    expect(count).toBe(2);
  });

  it("respects the gap", () => {
    const { count } = packRows(
      [
        { id: "a", start: 0, end: 10 },
        { id: "b", start: 12, end: 20 },
      ],
      5,
    );
    expect(count).toBe(2);
  });
});

describe("layoutLanes", () => {
  const opts = { rowHeight: 30, lanePadding: 5, gap: 10, top: 0 };

  it("stacks lanes in order and sizes them by their row count", () => {
    const { lanes, nodes, height } = layoutLanes(
      ["x", "y", "empty"],
      [
        { id: "a", lane: "x", label: "Alpha", x: 0 },
        { id: "b", lane: "x", label: "Beta", x: 5 },
        { id: "c", lane: "y", label: "Gamma", x: 0 },
      ],
      opts,
    );
    expect(lanes.map((l) => [l.id, l.y, l.rows])).toEqual([
      ["x", 0, 2],
      ["y", 70, 1],
      ["empty", 110, 1],
    ]);
    expect(height).toBe(150);
    expect(nodes.get("a")!.y).toBe(20);
    expect(nodes.get("b")!.y).toBe(50);
    expect(nodes.get("c")!.y).toBe(90);
  });
});
