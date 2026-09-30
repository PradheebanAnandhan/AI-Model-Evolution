import { describe, expect, it } from "vitest";
import { atlasStats, newestOf } from "@/lib/stats";
import { dataset, model } from "./fixtures";

const models = [
  model({ id: "a", releaseDate: "2019-05-01", family: "Alpha" }),
  model({ id: "b", releaseDate: "2024-02", family: "Alpha" }),
  model({ id: "c", org: "beta", releaseDate: "2023-11-30", family: "Alpha" }),
];

describe("atlasStats", () => {
  it("counts models, labs, families per lab, sources and the first year", () => {
    expect(atlasStats(dataset(models))).toEqual({ models: 3, orgs: 2, families: 2, sources: 3, first: 2019 });
  });
});

describe("newestOf", () => {
  it("picks the most recent release among the given ids", () => {
    expect(newestOf(models, ["a", "c"])).toBe("c");
    expect(newestOf(models, ["a", "b", "c"])).toBe("b");
  });

  it("returns undefined when none of the ids exist", () => {
    expect(newestOf(models, ["zzz"])).toBeUndefined();
  });
});
