import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, isFiltering, matchesFilters, parseViewState, serializeViewState, type ViewState } from "@/lib/filters";
import { model } from "./fixtures";

const known = { orgs: new Set(["acme", "beta"]), models: new Set(["gpt-4", "llama"]) };

describe("URL codec", () => {
  it("round-trips a full view state", () => {
    const state: ViewState = {
      model: "gpt-4",
      filters: {
        orgs: ["acme", "beta"],
        types: ["llm", "reasoning"],
        modalities: ["image"],
        openness: ["open-weights"],
        from: 2020,
        to: 2024,
        hide: true,
      },
    };
    const qs = serializeViewState(state);
    expect(qs).toContain("org=acme,beta");
    expect(parseViewState(new URLSearchParams(qs), known)).toEqual(state);
  });

  it("serializes the default state to an empty string", () => {
    expect(serializeViewState({ filters: EMPTY_FILTERS })).toBe("");
  });

  it("drops unknown values instead of failing", () => {
    const s = parseViewState(new URLSearchParams("org=acme,nope&type=bogus&open=closed&model=missing&from=20x"), known);
    expect(s.filters.orgs).toEqual(["acme"]);
    expect(s.filters.types).toEqual([]);
    expect(s.filters.openness).toEqual(["closed"]);
    expect(s.model).toBeUndefined();
    expect(s.filters.from).toBeUndefined();
  });

  it("repairs an inverted year range", () => {
    const s = parseViewState(new URLSearchParams("from=2024&to=2020"), known);
    expect([s.filters.from, s.filters.to]).toEqual([2024, 2024]);
  });
});

describe("matchesFilters", () => {
  const m = model({
    id: "m",
    org: "beta",
    releaseDate: "2023-06",
    type: "multimodal",
    openness: "open-weights",
    modalities: { input: ["text", "image"], output: ["text"] },
  });

  it("matches everything with no filters", () => {
    expect(isFiltering(EMPTY_FILTERS)).toBe(false);
    expect(matchesFilters(m, EMPTY_FILTERS)).toBe(true);
  });

  it("applies each dimension", () => {
    const f = (patch: Partial<typeof EMPTY_FILTERS>) => matchesFilters(m, { ...EMPTY_FILTERS, ...patch });
    expect(f({ orgs: ["beta"] })).toBe(true);
    expect(f({ orgs: ["acme"] })).toBe(false);
    expect(f({ types: ["llm"] })).toBe(false);
    expect(f({ openness: ["closed", "open-weights"] })).toBe(true);
    expect(f({ modalities: ["image"] })).toBe(true);
    expect(f({ modalities: ["audio"] })).toBe(false);
    expect(f({ from: 2023, to: 2023 })).toBe(true);
    expect(f({ from: 2024 })).toBe(false);
    expect(f({ to: 2022 })).toBe(false);
  });
});
