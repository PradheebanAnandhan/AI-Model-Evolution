import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelDetail } from "@/components/ModelDetail";
import { PageShell } from "@/components/PageShell";
import { getDataset } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { buildGraph } from "@/lib/graph";
import { buildIndex } from "@/lib/model-index";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDataset().models.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: PageProps<"/models/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { models, organizations } = getDataset();
  const m = models.find((x) => x.id === id);
  if (!m) return {};
  const org = organizations.find((o) => o.id === m.org);
  return {
    title: m.name,
    description: `${m.name} by ${org?.name ?? m.org}, released ${formatDate(m.releaseDate)}. ${m.summary}`,
  };
}

export default async function ModelPage({ params }: PageProps<"/models/[id]">) {
  const { id } = await params;
  const { models, organizations } = getDataset();
  const model = models.find((m) => m.id === id);
  if (!model) notFound();

  const graph = buildGraph(models);

  return (
    <PageShell>
      <Link href={`/explore?model=${model.id}`} className="link text-[14px]">
        ← {model.name} on the timeline
      </Link>
      <div className="mt-8">
        <ModelDetail
          model={model}
          org={organizations.find((o) => o.id === model.org)}
          incoming={graph.children.get(model.id) ?? []}
          index={buildIndex(models, organizations)}
          headingLevel="h1"
        />
      </div>
    </PageShell>
  );
}
