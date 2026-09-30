import { Suspense } from "react";
import { ChartFallback } from "@/components/ChartFallback";
import { Explorer } from "@/components/Explorer";
import { Hero } from "@/components/Hero";
import { SiteHeader } from "@/components/SiteHeader";
import { Horizon } from "@/components/SpaceBackground";
import { ANNOTATIONS } from "@/content/annotations";
import { MILESTONE_IDS } from "@/content/milestones";
import { getDataset } from "@/lib/data";
import { atlasStats, newestOf } from "@/lib/stats";

export default function TimelinePage() {
  const dataset = getDataset();
  const stats = atlasStats(dataset);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <SiteHeader />
      <Horizon />
      <main className="flex min-h-0 flex-1 flex-col">
        <Hero title="The evolution of" accent="AI models" stats={stats}>
          {stats.models} models from {stats.orgs} labs, from the Transformer in {stats.first} to this month. Each one sits on the day it was announced, linked to the
          models it builds on, and every fact links to its source.
        </Hero>
        {/* The chart reads its state from the URL, so it renders in the browser. */}
        <Suspense fallback={<ChartFallback models={dataset.models} label="Loading the timeline…" />}>
          <Explorer dataset={dataset} view="timeline" priorityIds={MILESTONE_IDS} annotations={ANNOTATIONS} featuredId={newestOf(dataset.models, MILESTONE_IDS)} />
        </Suspense>
      </main>
    </div>
  );
}
