import { describe, expect, it } from "vitest";
import { placeLabels, sideCandidates, type LabelRequest } from "@/lib/labels";

const req = (id: string, x: number, y: number, extra: Partial<LabelRequest> = {}): LabelRequest => ({
  id,
  x,
  y,
  r: 5,
  width: 60,
  height: 14,
  priority: 1,
  bandTop: 0,
  bandBottom: 200,
  ...extra,
});

const opts = { minX: 0, maxX: 1000 };

describe("placeLabels", () => {
  it("puts a lone label to the right of its dot", () => {
    const placed = placeLabels([req("a", 100, 50)], [], opts);
    expect(placed.get("a")).toMatchObject({ candidate: 0, x: 109 });
  });

  it("moves a colliding label to another side", () => {
    const placed = placeLabels([req("a", 100, 50), req("b", 110, 50)], [], opts);
    expect(placed.get("a")!.candidate).toBe(0);
    expect(placed.get("b")!.candidate).not.toBe(0);
  });

  it("places higher-priority labels first and drops what doesn't fit", () => {
    const band = { bandTop: 40, bandBottom: 60 }; // too thin for above/below
    const placed = placeLabels(
      [req("low", 100, 50, { priority: 5, ...band }), req("high", 102, 50, { priority: 0, ...band })],
      [],
      { minX: 95, maxX: 1000 },
    );
    expect(placed.has("high")).toBe(true);
    expect(placed.has("low")).toBe(false);
  });

  it("always places forced labels", () => {
    const band = { bandTop: 40, bandBottom: 60 };
    const placed = placeLabels(
      [req("a", 100, 50, { priority: 0, ...band }), req("hovered", 101, 50, { priority: 9, force: true, ...band })],
      [],
      { minX: 95, maxX: 1000 },
    );
    expect(placed.has("hovered")).toBe(true);
  });

  it("avoids obstacles other than its own dot", () => {
    const placed = placeLabels([req("a", 100, 50)], [{ id: "b", x: 115, y: 45, w: 10, h: 10 }], opts);
    expect(placed.get("a")!.candidate).not.toBe(0);
  });

  it("keeps a label's previous side when it is still free", () => {
    const placed = placeLabels([req("a", 100, 50)], [], { ...opts, previous: new Map([["a", 2]]) });
    expect(placed.get("a")!.candidate).toBe(2);
  });

  it("respects the horizontal bounds", () => {
    const placed = placeLabels([req("a", 980, 50)], [], opts);
    expect(placed.get("a")!.candidate).not.toBe(0);
  });
});

describe("placeLabels with side candidates", () => {
  const side = { ...opts, candidates: sideCandidates };

  it("hangs a label below and to the right of its dot, clear of the line through it", () => {
    const placed = placeLabels([req("a", 100, 50, { height: 30 })], [], side);
    expect(placed.get("a")).toMatchObject({ candidate: 0, x: 110, y: 52 });
  });

  it("tries the preferred positions in order", () => {
    const placed = placeLabels([req("a", 100, 50, { height: 30, prefer: [1, 0] })], [], side);
    expect(placed.get("a")).toMatchObject({ candidate: 1, y: 18 });
  });

  it("flips to the left near the right edge", () => {
    const placed = placeLabels([req("a", 980, 50, { height: 30 })], [], side);
    expect(placed.get("a")!.candidate).toBe(3);
  });
});
