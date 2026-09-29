import { Suspense } from "react";
import Link from "next/link";
import { Explorer } from "@/components/Explorer";
import { Story } from "@/components/landing/Story";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ANNOTATIONS } from "@/content/annotations";
import { CHAPTERS } from "@/content/story";
import { getDataset } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { buildRibbonData } from "@/lib/ribbon";

export default function Home() {
  const dataset = getDataset();
  const data = buildRibbonData(dataset);
  const { stats } = data;
  const updated = dataset.models.reduce((d, m) => (m.updated > d ? m.updated : d), "");
  const priorityIds = [...new Set([...CHAPTERS.flatMap((c) => c.models), ...ANNOTATIONS.map((a) => a.model)])];

  return (
    <>
      <SiteHeader />
      <main>
        <header className="mx-auto max-w-[1400px] px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
          <p className="kicker">Interactive atlas · Updated {formatDate(updated)}</p>
          <h1 className="font-display mt-3 max-w-4xl text-[clamp(2.5rem,5.6vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            The evolution of AI models
          </h1>
          <p className="font-display mt-5 max-w-3xl text-[clamp(1.15rem,1.9vw,1.4rem)] leading-[1.5] text-ink-2">
            Every major release from the Transformer in {stats.first} to this month: {stats.models} models from {stats.orgs} labs, placed on the
            day they arrived and connected to the models they build on. Every date, parameter count and relationship links to its source.
          </p>
          <p className="meta mt-5 flex flex-wrap gap-x-4 gap-y-1">
            <span>{stats.sources} sources</span>
            <span>{stats.links} lineage links</span>
            <a href="/data/models.json" download className="link text-ink-2">
              Download the data (JSON)
            </a>
            <Link href="/about" className="link text-ink-2">
              How it&apos;s sourced
            </Link>
          </p>
        </header>

        <div className="mx-auto max-w-[1400px] px-2 sm:px-6">
          <Suspense
            fallback={
              <div className="card flex h-[600px] items-center justify-center text-[14px] text-ink-3">
                Loading the timeline…
              </div>
            }
          >
            <Explorer dataset={dataset} variant="embedded" priorityIds={priorityIds} annotations={ANNOTATIONS} />
          </Suspense>
          <p className="mx-2 mt-3 max-w-4xl text-[13px] leading-relaxed text-ink-3 sm:mx-0">
            <strong className="font-semibold text-ink-2">How to read this chart.</strong> Each row is a lab and each dot a release, placed on its
            announcement date. Filled dots are open-weight models; rings are closed. Lines connect a model to the one it succeeds, derives from or
            was distilled from. Sources: official announcements, papers, model cards and repositories, linked from every record.
          </p>
        </div>

        <Story data={data} chapters={CHAPTERS} />

        <section id="about-data" className="border-t border-rule">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-20 sm:px-6 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="kicker">About the data</p>
              <h2 className="font-display mt-3 text-[2.2rem] font-semibold leading-tight tracking-[-0.02em]">Sourced, and honest about it</h2>
            </div>
            <div className="font-display space-y-4 text-[19px] leading-[1.6] text-ink-2 md:col-span-7 md:col-start-6">
              <p>
                Each model is a small, validated record: release date, lab, openness, parameters, context window, lineage, and the sources for
                each of them. A build fails if a citation or relationship doesn&apos;t resolve, or if a model is dated before the one it
                succeeds.
              </p>
              <p>
                Every record is currently a <em>draft</em>. The records were compiled by an AI assistant from primary sources, and nothing has
                been reviewed by a person yet. Sources that were opened and checked say so. Parameter counts that labs haven&apos;t
                disclosed are marked undisclosed, never estimated.
              </p>
              <p>
                The format is built for what comes next: a pipeline that watches papers, repositories and announcements, drafts a sourced
                record for each new release, and sends it for review.{" "}
                <Link href="/about" className="link text-ink">
                  Read the methodology
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter updated={updated} />
    </>
  );
}
