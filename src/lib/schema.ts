import { z } from "zod";

export const MODEL_TYPES = [
  "llm",
  "reasoning",
  "multimodal",
  "image",
  "video",
  "audio",
  "embedding",
  "code",
] as const;

export const MODALITIES = ["text", "image", "audio", "video"] as const;

export const OPENNESS = ["closed", "open-weights", "open-source"] as const;

export const RELATION_TYPES = [
  "successor-of",
  "derived-from",
  "distilled-from",
  "inspired-by",
] as const;

export const STATUSES = ["verified", "draft"] as const;

/**
 * Fields a citation may point at. Nested keys (e.g. `parameters`) cover the
 * whole object; the validator requires citations for the first four.
 */
export const CITABLE_FIELDS = [
  "releaseDate",
  "org",
  "openness",
  "parameters",
  "license",
  "architecture",
  "contextWindow",
  "trainingCutoff",
  "capabilities",
  "modalities",
  "variants",
  "relations",
  "summary",
] as const;

const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, "must be lowercase kebab-case");

export const PARTIAL_DATE_PATTERN = /^\d{4}(?:-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?)?$/;

/** `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. YAML reads a bare year as a number, so accept that too. */
export const PartialDate = z
  .union([z.string(), z.number().int()])
  .transform(String)
  .pipe(z.string().regex(PARTIAL_DATE_PATTERN, "must be YYYY, YYYY-MM or YYYY-MM-DD"));

const FullDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

export const SourceSchema = z
  .object({
    id: Slug,
    url: z.url(),
    title: z.string().min(1),
    publisher: z.string().optional(),
    /** When someone (or the pipeline) last opened the source and checked it. Required once an entry is verified. */
    accessed: FullDate.optional(),
  })
  .strict();

export const ParametersSchema = z
  .object({
    disclosed: z.boolean(),
    /** Total parameter count (not billions). */
    total: z.number().positive().optional(),
    /** Active parameters per token, for mixture-of-experts models. */
    active: z.number().positive().optional(),
  })
  .strict()
  .refine((p) => !p.disclosed || p.total !== undefined, {
    message: "disclosed parameters need a `total`",
  })
  .refine((p) => p.disclosed || (p.total === undefined && p.active === undefined), {
    message: "undisclosed parameters must not carry numbers",
  });

export const VariantSchema = z
  .object({
    name: z.string().min(1),
    parameters: ParametersSchema.optional(),
    notes: z.string().optional(),
  })
  .strict();

export const RelationSchema = z
  .object({
    target: Slug,
    type: z.enum(RELATION_TYPES),
    note: z.string().optional(),
  })
  .strict();

export const LinksSchema = z
  .object({
    paper: z.url().optional(),
    github: z.url().optional(),
    official: z.url().optional(),
    huggingface: z.url().optional(),
    modelCard: z.url().optional(),
  })
  .strict();

export const ModelSchema = z
  .object({
    id: Slug,
    name: z.string().min(1),
    aliases: z.array(z.string()).default([]),
    org: Slug,
    family: z.string().min(1),
    releaseDate: PartialDate,
    type: z.enum(MODEL_TYPES),
    modalities: z
      .object({
        input: z.array(z.enum(MODALITIES)).min(1),
        output: z.array(z.enum(MODALITIES)).min(1),
      })
      .strict(),
    openness: z.enum(OPENNESS),
    license: z.string().optional(),
    architecture: z.string().min(1),
    parameters: ParametersSchema,
    contextWindow: z.number().int().positive().optional(),
    trainingCutoff: PartialDate.optional(),
    capabilities: z.array(z.string()).default([]),
    summary: z.string().min(1),
    variants: z.array(VariantSchema).default([]),
    links: LinksSchema.default({}),
    relations: z.array(RelationSchema).default([]),
    sources: z.array(SourceSchema).min(1),
    citations: z.partialRecord(z.enum(CITABLE_FIELDS), z.array(Slug).min(1)),
    /** `draft` entries are unreviewed (e.g. AI-compiled); `verified` means a person checked every claim against its sources. */
    status: z.enum(STATUSES),
    /** When the entry was last changed. */
    updated: FullDate,
  })
  .strict();

export const OrganizationSchema = z
  .object({
    id: Slug,
    name: z.string().min(1),
    shortName: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    country: z.string().min(2),
    website: z.url(),
    order: z.number().int(),
  })
  .strict();

export const OrganizationsFileSchema = z.array(OrganizationSchema).min(1);

export type ModelType = (typeof MODEL_TYPES)[number];
export type Modality = (typeof MODALITIES)[number];
export type Openness = (typeof OPENNESS)[number];
export type RelationType = (typeof RELATION_TYPES)[number];
export type CitableField = (typeof CITABLE_FIELDS)[number];
export type Source = z.infer<typeof SourceSchema>;
export type Parameters = z.infer<typeof ParametersSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;

export interface Dataset {
  organizations: Organization[];
  models: Model[];
}
