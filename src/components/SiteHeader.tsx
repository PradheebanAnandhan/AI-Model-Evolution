import Link from "next/link";
import { getDataset } from "@/lib/data";
import { TYPE_LABEL } from "@/lib/format";
import { HeaderSearch, type SearchItem } from "./header/HeaderSearch";
import { NavTabs } from "./header/NavTabs";
import { DownloadIcon } from "./icons";
import { LogoMark } from "./Logo";

/** The bar at the top of every page: the mark, the navigation, search and the data download. */
export function SiteHeader() {
  const { models, organizations } = getDataset();
  const orgs = new Map(organizations.map((o) => [o.id, o]));
  const items: SearchItem[] = [...models].reverse().map((m) => ({
    id: m.id,
    name: m.name,
    aliases: m.aliases,
    family: m.family,
    orgName: orgs.get(m.org)?.name ?? m.org,
    color: orgs.get(m.org)?.color ?? "#8b9ab3",
    type: TYPE_LABEL[m.type],
    date: m.releaseDate,
    variants: m.variants.map((v) => v.name),
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-[rgb(5_7_13/0.92)]">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="AI Model Evolution, home">
          <LogoMark />
          <span className="text-[16.5px] font-semibold tracking-[-0.015em] text-white">
            AI Model <span className="text-gradient">Evolution</span>
          </span>
        </Link>
        <NavTabs className="hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch items={items} />
          <a
            href="/data/models.json"
            download
            className="grid size-10 place-items-center rounded-xl border border-rule bg-glass text-ink-2 transition-colors hover:border-rule-2 hover:text-ink"
            aria-label="Download the data (JSON)"
            title="Download the data (JSON)"
          >
            <DownloadIcon width={17} height={17} />
          </a>
        </div>
      </div>
      <NavTabs className="-mt-1 overflow-x-auto px-2 pb-2 md:hidden" />
    </header>
  );
}
