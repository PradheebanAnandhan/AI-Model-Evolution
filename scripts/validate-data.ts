import path from "node:path";
import { loadData, DEFAULT_DATA_DIR } from "../src/lib/data";

const dataDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DATA_DIR;
const { dataset, errors, warnings } = loadData(dataDir);

const where = (i: { file?: string; model?: string }) => i.file ?? i.model ?? "dataset";

for (const w of warnings) console.warn(`warning  ${where(w)}: ${w.message}`);
for (const e of errors) console.error(`error    ${where(e)}: ${e.message}`);

const drafts = dataset.models.filter((m) => m.status === "draft").length;
console.log(
  `\n${dataset.models.length} models, ${dataset.organizations.length} organizations, ` +
    `${drafts} drafts — ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
