// Writes schema/*.schema.json from the Zod schemas. The future extraction
// pipeline uses model.schema.json as its structured-output contract.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ModelSchema, OrganizationsFileSchema, PARTIAL_DATE_PATTERN, PartialDate } from "../src/lib/schema";

const outDir = path.join(process.cwd(), "schema");
fs.mkdirSync(outDir, { recursive: true });

const targets = {
  "model.schema.json": ModelSchema,
  "organizations.schema.json": OrganizationsFileSchema,
};

for (const [file, schema] of Object.entries(targets)) {
  const json = z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "any",
    override: (ctx) => {
      // Describe partial dates by their pattern rather than the string|number input union.
      if (ctx.zodSchema === PartialDate) {
        for (const key of Object.keys(ctx.jsonSchema)) delete (ctx.jsonSchema as Record<string, unknown>)[key];
        Object.assign(ctx.jsonSchema, { type: "string", pattern: PARTIAL_DATE_PATTERN.source });
      }
    },
  });
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(json, null, 2) + "\n");
  console.log(`wrote schema/${file}`);
}
