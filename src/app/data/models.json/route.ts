import { getDataset } from "@/lib/data";

// Emitted as a static file at build time (output: "export").
export const dynamic = "force-static";

export function GET() {
  const { organizations, models } = getDataset();
  return Response.json({
    description: "AI Model Evolution dataset. Every record is a draft pending human review; see /about.",
    organizations,
    models,
  });
}
