import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/components/PageShell";
import { getDataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the AI Model Evolution atlas is built, sourced and maintained.",
};

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-12 text-[1.55rem] font-semibold leading-tight tracking-[-0.025em] text-white">{children}</h2>;
}

export default function AboutPage() {
  const { models, organizations } = getDataset();
  const verified = models.filter((m) => m.status === "verified").length;
  const sources = models.reduce((n, m) => n + m.sources.length, 0);
  const checked = models.reduce((n, m) => n + m.sources.filter((s) => s.accessed).length, 0);

  return (
    <PageShell>
      <article className="text-[16.5px] leading-[1.75] text-ink-2 [&_li]:mt-2 [&_p]:mt-4">
        <p className="kicker !mt-0">Methodology</p>
        <h1 className="mt-3 text-[clamp(2.2rem,4.5vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">
          How this atlas <span className="text-gradient">is made</span>
        </h1>
        <p className="text-[18.5px] text-ink">
          An interactive map of the AI ecosystem: what was released, when, by whom, what it can do, and how each model relates to the ones
          before it.
        </p>

        <dl className="glass mt-8 grid grid-cols-2 gap-x-6 gap-y-4 rounded-2xl px-6 py-5 sm:grid-cols-4">
          {[
            ["Models", models.length],
            ["Labs", organizations.length],
            ["Sources", sources],
            ["Reviewed", verified],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12.5px] text-ink-3">{label}</dt>
              <dd className="text-[28px] font-semibold tabular-nums tracking-[-0.02em] text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <H2>Status of the data</H2>
        <p>
          Every record is currently a <em>draft</em>. The seed dataset was compiled by an AI assistant from the primary sources listed in
          each record. Releases from late 2025 and 2026 were researched on September 30, 2026. {checked} sources were opened and checked
          during that research; those show a &ldquo;checked&rdquo; date. Nothing has been reviewed by a person yet. A record is marked
          reviewed only after someone checks every claim against its sources, and the validator requires reviewed records to date every
          source check.
        </p>

        <H2>Reading the timeline</H2>
        <ul className="list-disc pl-5 marker:text-ink-3">
          <li>
            Each row is a lab, with its line running through its releases. Labs with fewer than five models share the &ldquo;Other labs&rdquo;
            row; select it to give each one its own row.
          </li>
          <li>
            Each glowing dot is a release, placed on its announcement date. A solid dot with a white core means the weights can be
            downloaded; a ring means the model is closed. Milestones are drawn larger.
          </li>
          <li>
            Lines connect related models and take the newer model&apos;s lab color, blending between colors when they cross labs. A solid
            line is a direct successor, a dashed line a fine-tune or derivative, a dotted line a distillation, and a faint dotted line an
            architectural or methodological influence.
          </li>
          <li>
            By default, busier years get more room, so the crowded recent years stay readable. Switch the spacing to
            &ldquo;Calendar&rdquo; below the chart to give every year the same width; the monthly chart beside it always uses true time.
          </li>
          <li>
            Labels appear where there is room: milestones first, then the roots of model families, then the newest releases. Hover a
            dot or zoom in (Ctrl or ⌘ + scroll) to see the rest.
          </li>
          <li>Press Play to replay history from 2017, or ⌘K to search. With a keyboard, Tab into the chart and use the arrow keys.</li>
        </ul>

        <H2>What counts as a model</H2>
        <p>
          A dot is a <em>release</em>, not a checkpoint. Tiers launched together, such as Claude 3 Haiku, Sonnet and Opus, or Llama 2 7B, 13B
          and 70B, are listed as variants inside one record, which keeps the chart readable. A later release in the same family gets its own
          dot.
        </p>

        <H2>Sourcing policy</H2>
        <ul className="list-disc pl-5 marker:text-ink-3">
          <li>Every record cites its sources field by field. The small numbers link to the numbered sources at the end of each record.</li>
          <li>
            Primary sources come first: papers, official announcements, model cards and repositories. Encyclopedic sources such as Wikipedia
            are used only to cross-check dates.
          </li>
          <li>
            Release date, lab and openness must be cited. The parameter count must be cited whenever it is disclosed. Unofficial parameter
            estimates are never shown as fact; those records say &ldquo;undisclosed&rdquo;.
          </li>
          <li>Partial dates (a year, or a year and month) are allowed when the exact day isn&apos;t documented.</li>
        </ul>

        <H2>How the data is stored</H2>
        <p>
          Each model is one YAML file in{" "}
          <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[15px]">data/models/&lt;lab&gt;/&lt;id&gt;.yaml</code>, validated
          against a schema also published as <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[15px]">schema/model.schema.json</code>.
          The build fails if a citation or relation doesn&apos;t resolve, if a successor is dated before the model it succeeds, or if the lineage
          contains a cycle. The whole dataset can be{" "}
          <a href="/data/models.json" download className="link text-ink">
            downloaded as JSON
          </a>
          .
        </p>

        <H2>Where this is going</H2>
        <p>
          The long-term aim is an atlas that keeps itself current. An extraction pipeline will watch papers, GitHub and official
          announcements. It will pull structured data out of each new release, work out how the release relates to earlier models, and propose
          a sourced draft for a person to review.
        </p>

        <p className="!mt-12 flex flex-wrap gap-6 text-[15px]">
          <Link href="/" className="link font-medium text-ink">
            Open the timeline →
          </Link>
          <Link href="/explore" className="link">
            Browse every model
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
