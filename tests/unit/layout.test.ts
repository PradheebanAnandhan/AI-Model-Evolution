import { describe, expect, it } from "vitest";
import { assignSlots, slotOffset } from "@/lib/layout";

describe("assignSlots", () => {
  it("keeps well-spaced nodes on the centre line", () => {
    const slots = assignSlots(
      [
        { id: "a", x: 0 },
        { id: "b", x: 20 },
        { id: "c", x: 40 },
      ],
      14,
    );
    expect([...slots.values()]).toEqual([0, 0, 0]);
  });

  it("moves crowded nodes above, then below, and returns to the centre when there's room", () => {
    const slots = assignSlots(
      [
        { id: "a", x: 0 },
        { id: "b", x: 4 },
        { id: "c", x: 8 },
        { id: "d", x: 30 },
      ],
      14,
    );
    expect(slots.get("a")).toBe(0);
    expect(slots.get("b")).toBe(1);
    expect(slots.get("c")).toBe(2);
    expect(slots.get("d")).toBe(0);
  });

  it("reuses the line that frees up soonest when every line is taken", () => {
    const slots = assignSlots(
      [
        { id: "a", x: 0 },
        { id: "b", x: 1 },
        { id: "c", x: 2 },
        { id: "d", x: 3 },
      ],
      14,
    );
    expect(slots.get("d")).toBe(0);
  });

  it("orders by position, not input order", () => {
    const slots = assignSlots(
      [
        { id: "late", x: 5 },
        { id: "early", x: 0 },
      ],
      14,
    );
    expect(slots.get("early")).toBe(0);
    expect(slots.get("late")).toBe(1);
  });
});

describe("slotOffset", () => {
  it("alternates above and below the centre", () => {
    expect([0, 1, 2, 3, 4].map((s) => slotOffset(s, 10))).toEqual([0, -10, 10, -20, 20]);
  });
});
