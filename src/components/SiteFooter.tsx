import Link from "next/link";
import { formatDate } from "@/lib/format";

export function SiteFooter({ updated }: { updated: string }) {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-ink-3 sm:px-6">
        <span>
          <span className="font-display font-semibold text-ink">AI Model Evolution</span> · updated {formatDate(updated)}
        </span>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/explore" className="link">
            Timeline
          </Link>
          <Link href="/about" className="link">
            Methodology
          </Link>
          <a href="/data/models.json" download className="link">
            Data (JSON)
          </a>
        </nav>
      </div>
    </footer>
  );
}
