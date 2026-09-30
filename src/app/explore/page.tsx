import type { Metadata } from "next";
import { Suspense } from "react";
import { ChartFallback } from "@/components/ChartFallback";
import { Explorer } from "@/components/Explorer";
import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { Horizon } from "@/components/SpaceBackground";
import { MILESTONE_IDS } from "@/content/milestones";
import { getDataset } from "@/lib/data";
import { atlasStats, newestOf } from "@/lib/stats";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search, filter and sort every AI model in the atlas, and read each one's sourced record.",
};

export default function ExplorePage() {
  const dataset = getDataset();
  const stats = atlasStats(dataset);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <SiteHeader />
      <Horizon />
      <main className="flex min-h-0 flex-1 flex-col">
        <Hero title="Explore" accent="every model" stats={stats}>
          Search, filter and sort all {stats.models} records. Pick a model to read its record: release date, openness, parameters, context window and lineage, each
          with its source.
        </Hero>
        <Suspense fallback={<ChartFallback models={dataset.models} label="Loading the table…" />}>
          <Explorer dataset={dataset} view="list" priorityIds={MILESTONE_IDS} featuredId={newestOf(dataset.models, MILESTONE_IDS)} />
        </Suspense>
      </main>
    </div>
  );
}
