import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Explorer } from "@/components/Explorer";
import { SiteHeader } from "@/components/SiteHeader";
import { ANNOTATIONS } from "@/content/annotations";
import { CHAPTERS } from "@/content/story";
import { getDataset } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Pan, zoom and search an interactive timeline of AI models and their lineage.",
};

export default function ExplorePage() {
  const dataset = getDataset();
  const priorityIds = [...new Set([...CHAPTERS.flatMap((c) => c.models), ...ANNOTATIONS.map((a) => a.model)])];
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      {/* The explorer reads its state from the URL, so it renders on the client; the fallback is a crawlable list. */}
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-3xl overflow-auto px-4 py-10">
            <h1 className="font-display text-3xl font-semibold">AI models, 2017 to today</h1>
            <ul className="mt-6 space-y-1 text-[14px]">
              {[...dataset.models].reverse().map((m) => (
                <li key={m.id}>
                  <Link href={`/models/${m.id}`} className="link">
                    {m.name}
                  </Link>{" "}
                  <span className="text-ink-3">— {formatDate(m.releaseDate)}</span>
                </li>
              ))}
            </ul>
          </main>
        }
      >
        <Explorer dataset={dataset} variant="full" priorityIds={priorityIds} annotations={ANNOTATIONS} />
      </Suspense>
    </div>
  );
}
