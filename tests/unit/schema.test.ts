import { describe, expect, it } from "vitest";
import { ModelSchema } from "@/lib/schema";
import { model } from "./fixtures";

describe("ModelSchema", () => {
  it("accepts a minimal model and fills defaults", () => {
    const m = model({ id: "a" });
    expect(m.aliases).toEqual([]);
    expect(m.relations).toEqual([]);
    expect(m.links).toEqual({});
  });

  it("accepts year, year-month and full dates, including a bare numeric year", () => {
    expect(model({ id: "a", releaseDate: "2020" }).releaseDate).toBe("2020");
    expect(model({ id: "a", releaseDate: "2020-05" }).releaseDate).toBe("2020-05");
    expect(model({ id: "a", releaseDate: 2019 }).releaseDate).toBe("2019");
  });

  it("rejects malformed dates", () => {
    expect(() => model({ id: "a", releaseDate: "2020-13" })).toThrow();
    expect(() => model({ id: "a", releaseDate: "May 2020" })).toThrow();
  });

  it("requires a total when parameters are disclosed, and no numbers when they aren't", () => {
    expect(() => model({ id: "a", parameters: { disclosed: true } })).toThrow(/total/);
    expect(() => model({ id: "a", parameters: { disclosed: false, total: 5 } })).toThrow(/undisclosed/);
    expect(model({ id: "a", parameters: { disclosed: true, total: 7e9 } }).parameters.total).toBe(7e9);
  });

  it("rejects unknown fields so typos surface", () => {
    const result = ModelSchema.safeParse({ ...model({ id: "a" }), releaseDat: "2020" });
    expect(result.success).toBe(false);
  });

  it("rejects non-kebab-case ids", () => {
    expect(() => model({ id: "GPT_4" })).toThrow();
  });
});
