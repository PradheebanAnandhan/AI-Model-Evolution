import { buildGraph, findCycles } from "./graph";
import { dateEnd, dateStart } from "./format";
import type { CitableField, Dataset } from "./schema";

export interface Issue {
  file?: string;
  model?: string;
  message: string;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
}

const REQUIRED_CITATIONS: CitableField[] = ["releaseDate", "org", "openness"];

/**
 * Cross-file checks that a per-file schema parse can't express. `files` maps
 * model id -> file path, for error messages and filename checks.
 */
export function validateDataset(data: Dataset, files: Map<string, string> = new Map()): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const orgIds = new Set(data.organizations.map((o) => o.id));
  const byId = new Map<string, Dataset["models"][number]>();

  const seenOrgs = new Set<string>();
  for (const o of data.organizations) {
    if (seenOrgs.has(o.id)) errors.push({ message: `duplicate organization id "${o.id}"` });
    seenOrgs.add(o.id);
  }

  for (const m of data.models) {
    const file = files.get(m.id);
    const err = (message: string) => errors.push({ file, model: m.id, message });
    const warn = (message: string) => warnings.push({ file, model: m.id, message });

    if (byId.has(m.id)) err(`duplicate model id (also in ${files.get(m.id) ?? "another file"})`);
    byId.set(m.id, m);

    if (file) {
      const base = file.replace(/\\/g, "/").split("/").pop()!.replace(/\.ya?ml$/, "");
      if (base !== m.id) err(`filename "${base}" does not match id "${m.id}"`);
      const dir = file.replace(/\\/g, "/").split("/").slice(-2, -1)[0];
      if (dir !== m.org) err(`file is in folder "${dir}" but org is "${m.org}"`);
    }

    if (!orgIds.has(m.org)) err(`unknown organization "${m.org}"`);

    const sourceIds = new Set<string>();
    for (const s of m.sources) {
      if (sourceIds.has(s.id)) err(`duplicate source id "${s.id}"`);
      sourceIds.add(s.id);
    }

    const cited = new Set<string>();
    for (const [field, ids] of Object.entries(m.citations)) {
      for (const id of ids ?? []) {
        if (!sourceIds.has(id)) err(`citation for "${field}" points at unknown source "${id}"`);
        cited.add(id);
      }
    }
    for (const field of REQUIRED_CITATIONS) {
      if (!m.citations[field]) err(`missing citation for "${field}"`);
    }
    if (m.parameters.disclosed && !m.citations.parameters) err(`disclosed parameters need a citation`);
    if (m.contextWindow !== undefined && !m.citations.contextWindow) warn(`contextWindow is not cited`);
    for (const s of m.sources) if (!cited.has(s.id)) warn(`source "${s.id}" is never cited`);
    if (m.status === "verified") {
      for (const s of m.sources) if (!s.accessed) err(`verified entry cites source "${s.id}" with no accessed date`);
    }

    if (m.parameters.active && m.parameters.total && m.parameters.active > m.parameters.total) {
      err(`active parameters exceed total`);
    }

    const targets = new Set<string>();
    for (const r of m.relations) {
      if (r.target === m.id) err(`relation points at itself`);
      if (targets.has(r.target)) err(`more than one relation to "${r.target}"`);
      targets.add(r.target);
    }
  }

  for (const m of data.models) {
    const file = files.get(m.id);
    for (const r of m.relations) {
      const target = byId.get(r.target);
      if (!target) {
        errors.push({ file, model: m.id, message: `relation target "${r.target}" does not exist` });
        continue;
      }
      // The newer model declares the relation, so its date can't be before the older one's.
      if (dateEnd(m.releaseDate) < dateStart(target.releaseDate)) {
        errors.push({
          file,
          model: m.id,
          message: `released ${m.releaseDate}, before its "${r.type}" target "${r.target}" (${target.releaseDate})`,
        });
      }
    }
  }

  const graph = buildGraph(data.models);
  for (const cycle of findCycles(graph)) {
    errors.push({ model: cycle[0], message: `relation cycle: ${cycle.join(" -> ")}` });
  }

  return { errors, warnings };
}
