import { ModelSchema, type Dataset, type Model, type Organization } from "@/lib/schema";

export const ORGS: Organization[] = [
  { id: "acme", name: "Acme AI", color: "#ff0000", country: "US", website: "https://acme.example", order: 1 },
  { id: "beta", name: "Beta Labs", color: "#00ff00", country: "FR", website: "https://beta.example", order: 2 },
];

/** A minimal valid model; override any field. */
export function model(overrides: Partial<Record<keyof Model, unknown>> & { id: string }): Model {
  return ModelSchema.parse({
    name: overrides.id.toUpperCase(),
    org: "acme",
    family: "Test",
    releaseDate: "2023-01-01",
    type: "llm",
    modalities: { input: ["text"], output: ["text"] },
    openness: "closed",
    architecture: "Transformer",
    parameters: { disclosed: false },
    summary: "A test model.",
    sources: [{ id: "s1", url: "https://example.com", title: "Source", accessed: "2026-01-01" }],
    citations: { releaseDate: ["s1"], org: ["s1"], openness: ["s1"] },
    status: "verified",
    updated: "2026-01-01",
    ...overrides,
  });
}

export function dataset(models: Model[]): Dataset {
  return { organizations: ORGS, models };
}
