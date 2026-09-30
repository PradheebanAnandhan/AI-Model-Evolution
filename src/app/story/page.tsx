import type { Metadata } from "next";
import { Story } from "@/components/landing/Story";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { CHAPTERS } from "@/content/story";
import { getDataset } from "@/lib/data";
import { buildRibbonData } from "@/lib/ribbon";

export const metadata: Metadata = {
  title: "Story",
  description: "How AI models got here, from the Transformer to trillion-parameter frontiers, in eight chapters.",
};

export default function StoryPage() {
  const dataset = getDataset();
  const updated = dataset.models.reduce((d, m) => (m.updated > d ? m.updated : d), "");
  return (
    <>
      <SiteHeader />
      <main>
        <Story data={buildRibbonData(dataset)} chapters={CHAPTERS} />
      </main>
      <SiteFooter updated={updated} />
    </>
  );
}
