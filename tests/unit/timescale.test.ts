import { describe, expect, it } from "vitest";
import { buildTimeScale, yearBoundaries, yearWidths } from "@/lib/timescale";

const t = (y: number, m = 6, d = 1) => Date.UTC(y, m - 1, d);

describe("yearBoundaries", () => {
  it("covers every year through the end of the last", () => {
    expect(yearBoundaries(2020, 2022).map((d) => d.toISOString().slice(0, 10))).toEqual(["2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01"]);
  });
});

describe("yearWidths", () => {
  it("in calendar mode, is proportional to each year's length", () => {
    const [a, b] = yearWidths([2020, 2021], [0, 0], 731, "calendar");
    expect(a).toBeCloseTo(366);
    expect(b).toBeCloseTo(365);
  });

  it("in activity mode, gives busier years more room but every year a minimum", () => {
    const widths = yearWidths([2020, 2021, 2022], [0, 2, 20], 600, "activity", 50);
    expect(widths.reduce((s, w) => s + w, 0)).toBeCloseTo(600);
    expect(widths[0]).toBeCloseTo(50);
    expect(widths[2]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[0]);
  });

  it("shrinks the minimum on narrow charts so there is still room to weight", () => {
    const widths = yearWidths([2020, 2021], [0, 10], 100, "activity", 56);
    expect(widths[0]).toBeCloseTo(35);
  });
});

describe("buildTimeScale", () => {
  const times = [t(2017), t(2020), t(2024), t(2024, 3), t(2024, 9), t(2025)];

  it("maps the first and last year edges to the ends of the range", () => {
    const s = buildTimeScale(times, "activity", [100, 1100]);
    expect(s(new Date(Date.UTC(2017, 0, 1)))).toBeCloseTo(100);
    expect(s(new Date(Date.UTC(2026, 0, 1)))).toBeCloseTo(1100);
  });

  it("extends to include now", () => {
    const s = buildTimeScale(times, "calendar", [0, 1000], t(2027, 3));
    expect(s(new Date(Date.UTC(2028, 0, 1)))).toBeCloseTo(1000);
  });

  it("is monotonic and invertible", () => {
    const s = buildTimeScale(times, "activity", [0, 1000]);
    let prev = -Infinity;
    for (let y = 2017; y <= 2025; y++) {
      for (const m of [1, 4, 7, 10]) {
        const d = new Date(t(y, m));
        const px = s(d);
        expect(px).toBeGreaterThan(prev);
        expect(Math.abs(s.invert(px).getTime() - d.getTime())).toBeLessThan(1000);
        prev = px;
      }
    }
  });

  it("gives the busiest year the widest span in activity mode", () => {
    const s = buildTimeScale(times, "activity", [0, 1000]);
    const width = (y: number) => s(new Date(Date.UTC(y + 1, 0, 1))) - s(new Date(Date.UTC(y, 0, 1)));
    expect(width(2024)).toBeGreaterThan(width(2020));
    expect(width(2020)).toBeGreaterThan(width(2019));
  });
});
