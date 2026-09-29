import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadData } from "@/lib/data";
import { dateValue, formatDate, formatParameters, formatTokens } from "@/lib/format";
import { validateDataset } from "@/lib/validate";
import { dataset, model } from "./fixtures";

const messages = (models: ReturnType<typeof model>[]) => validateDataset(dataset(models)).errors.map((e) => e.message);

describe("validateDataset", () => {
  it("passes a consistent dataset", () => {
    const r = validateDataset(
      dataset([model({ id: "a" }), model({ id: "b", releaseDate: "2024", relations: [{ target: "a", type: "successor-of" }] })]),
    );
    expect(r.errors).toEqual([]);
  });

  it("flags unknown organizations, missing relation targets and bad citations", () => {
    const errs = messages([
      model({ id: "a", org: "nobody" }),
      model({ id: "b", relations: [{ target: "ghost", type: "derived-from" }] }),
      model({ id: "c", citations: { releaseDate: ["s1"], org: ["s1"], openness: ["nope"] } }),
    ]);
    expect(errs).toContain('unknown organization "nobody"');
    expect(errs).toContain('relation target "ghost" does not exist');
    expect(errs).toContain('citation for "openness" points at unknown source "nope"');
  });

  it("requires citations for core fields and disclosed parameters", () => {
    const errs = messages([
      model({ id: "a", citations: { releaseDate: ["s1"], org: ["s1"] }, parameters: { disclosed: true, total: 1e9 } }),
    ]);
    expect(errs).toContain('missing citation for "openness"');
    expect(errs).toContain("disclosed parameters need a citation");
  });

  it("rejects a successor dated before its predecessor", () => {
    const errs = messages([
      model({ id: "old", releaseDate: "2024-05" }),
      model({ id: "new", releaseDate: "2023", relations: [{ target: "old", type: "successor-of" }] }),
    ]);
    expect(errs.some((e) => e.includes("before its"))).toBe(true);
  });

  it("allows same-period dates at different precisions", () => {
    const errs = messages([
      model({ id: "old", releaseDate: "2024-05-20" }),
      model({ id: "new", releaseDate: "2024-05", relations: [{ target: "old", type: "successor-of" }] }),
    ]);
    expect(errs).toEqual([]);
  });

  it("requires accessed dates on every source of a verified entry", () => {
    const sources = [{ id: "s1", url: "https://example.com", title: "Source" }];
    expect(messages([model({ id: "a", status: "draft", sources })])).toEqual([]);
    expect(messages([model({ id: "a", status: "verified", sources })])).toContain(
      'verified entry cites source "s1" with no accessed date',
    );
  });

  it("detects cycles and duplicate ids", () => {
    const errs = messages([
      model({ id: "a", releaseDate: "2023", relations: [{ target: "b", type: "successor-of" }] }),
      model({ id: "b", releaseDate: "2023", relations: [{ target: "a", type: "successor-of" }] }),
      model({ id: "b" }),
    ]);
    expect(errs.some((e) => e.startsWith("relation cycle"))).toBe(true);
    expect(errs.some((e) => e.startsWith("duplicate model id"))).toBe(true);
  });

  it("checks that files are named and filed by id and org", () => {
    const r = validateDataset(dataset([model({ id: "a" })]), new Map([["a", "models/beta/b.yaml"]]));
    const errs = r.errors.map((e) => e.message);
    expect(errs).toContain('filename "b" does not match id "a"');
    expect(errs).toContain('file is in folder "beta" but org is "acme"');
  });
});

describe("real data", () => {
  it("loads and validates the repository dataset", () => {
    const { errors, dataset } = loadData(path.join(process.cwd(), "data"));
    expect(errors).toEqual([]);
    expect(dataset.models.length).toBeGreaterThan(0);
  });

  it("reports errors for the broken fixture", () => {
    const { errors } = loadData(path.join(__dirname, "fixtures", "broken-data"));
    const text = errors.map((e) => `${e.file}: ${e.message}`).join("\n");
    expect(text).toMatch(/releaseDate/);
    expect(text).toMatch(/relation target "does-not-exist" does not exist/);
  });
});

describe("format", () => {
  it("formats partial dates by precision", () => {
    expect(formatDate("2023")).toBe("2023");
    expect(formatDate("2023-03")).toBe("Mar 2023");
    expect(formatDate("2023-03-14")).toBe("Mar 14, 2023");
  });

  it("places imprecise dates mid-period", () => {
    expect(dateValue("2023").toISOString().slice(0, 10)).toBe("2023-07-01");
    expect(dateValue("2023-03").toISOString().slice(0, 10)).toBe("2023-03-15");
  });

  it("formats context windows the way labs quote them", () => {
    expect(formatTokens(8192)).toBe("8K");
    expect(formatTokens(32768)).toBe("32K");
    expect(formatTokens(128000)).toBe("128K");
    expect(formatTokens(200000)).toBe("200K");
    expect(formatTokens(1000000)).toBe("1M");
    expect(formatTokens(1048576)).toBe("1M");
    expect(formatTokens(4000)).toBe("4K");
    expect(formatTokens(1500)).toBe("1,500");
  });

  it("formats parameter counts", () => {
    expect(formatParameters({ disclosed: false })).toBe("Undisclosed");
    expect(formatParameters({ disclosed: true, total: 175e9 })).toBe("175B");
    expect(formatParameters({ disclosed: true, total: 671e9, active: 37e9 })).toBe("671B total · 37B active");
    expect(formatParameters({ disclosed: true, total: 1.5e9 })).toBe("1.5B");
    expect(formatParameters({ disclosed: true, total: 65e6 })).toBe("65M");
  });
});
