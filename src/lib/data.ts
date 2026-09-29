// Build-time only: reads the YAML files under data/. Never import from client components.
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { ModelSchema, OrganizationsFileSchema, type Dataset, type Model } from "./schema";
import { validateDataset, type Issue, type ValidationResult } from "./validate";

export const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");

export interface LoadResult extends ValidationResult {
  dataset: Dataset;
  /** model id -> file path relative to the data dir */
  files: Map<string, string>;
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Loads and validates everything, collecting problems instead of throwing. */
export function loadData(dataDir = DEFAULT_DATA_DIR): LoadResult {
  const errors: Issue[] = [];
  const files = new Map<string, string>();

  const orgFile = path.join(dataDir, "organizations.yaml");
  let organizations: Dataset["organizations"] = [];
  const orgParse = OrganizationsFileSchema.safeParse(parse(fs.readFileSync(orgFile, "utf8")));
  if (orgParse.success) organizations = orgParse.data;
  else errors.push({ file: "organizations.yaml", message: formatZodError(orgParse.error) });

  const modelsDir = path.join(dataDir, "models");
  const modelFiles = fs
    .readdirSync(modelsDir, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => f.replace(/\\/g, "/"))
    .sort();

  const models: Model[] = [];
  for (const rel of modelFiles) {
    const file = `models/${rel}`;
    let raw: unknown;
    try {
      raw = parse(fs.readFileSync(path.join(modelsDir, rel), "utf8"));
    } catch (e) {
      errors.push({ file, message: `YAML parse error: ${(e as Error).message}` });
      continue;
    }
    const result = ModelSchema.safeParse(raw);
    if (!result.success) {
      errors.push({ file, message: formatZodError(result.error) });
      continue;
    }
    if (!files.has(result.data.id)) files.set(result.data.id, file);
    models.push(result.data);
  }

  const dataset: Dataset = {
    organizations: [...organizations].sort((a, b) => a.order - b.order),
    models: models.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate) || a.name.localeCompare(b.name)),
  };
  const checks = validateDataset(dataset, files);
  return { dataset, files, errors: [...errors, ...checks.errors], warnings: checks.warnings };
}

let cached: Dataset | undefined;

/** Used by pages at build time; fails the build if the data is invalid. */
export function getDataset(): Dataset {
  if (cached) return cached;
  const { dataset, errors } = loadData();
  if (errors.length) {
    const lines = errors.map((e) => `  ${e.file ?? e.model ?? ""}: ${e.message}`).join("\n");
    throw new Error(`Invalid model data (run \`npm run validate\`):\n${lines}`);
  }
  cached = dataset;
  return dataset;
}
