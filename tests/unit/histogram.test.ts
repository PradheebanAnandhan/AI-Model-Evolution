import { describe, expect, it } from "vitest";
import { monthBins } from "@/lib/histogram";
import { monogram } from "@/lib/org";

describe("monthBins", () => {
  it("has one bin per month, inclusive, with models in date order", () => {
    const bins = monthBins(
      [
        { id: "b", t: Date.UTC(2024, 1, 20) },
        { id: "a", t: Date.UTC(2024, 1, 3) },
        { id: "c", t: Date.UTC(2024, 3, 1) },
      ],
      Date.UTC(2024, 0, 15),
      Date.UTC(2024, 3, 2),
    );
    expect(bins.map((b) => new Date(b.start).toISOString().slice(0, 7))).toEqual(["2024-01", "2024-02", "2024-03", "2024-04"]);
    expect(bins.map((b) => b.ids)).toEqual([[], ["a", "b"], [], ["c"]]);
  });

  it("ignores models outside the range", () => {
    const bins = monthBins([{ id: "x", t: Date.UTC(2030, 0, 1) }], Date.UTC(2024, 0, 1), Date.UTC(2024, 0, 1));
    expect(bins).toHaveLength(1);
    expect(bins[0].ids).toEqual([]);
  });
});

describe("monogram", () => {
  it("keeps short names whole and otherwise uses the initial", () => {
    expect(monogram({ name: "xAI" })).toBe("xAI");
    expect(monogram({ name: "Technology Innovation Institute", shortName: "TII" })).toBe("TII");
    expect(monogram({ name: "OpenAI" })).toBe("O");
    expect(monogram({ name: "Google / DeepMind", shortName: "Google" })).toBe("G");
  });
});
