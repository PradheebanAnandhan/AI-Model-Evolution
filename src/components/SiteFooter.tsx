import Link from "next/link";
import { formatDate } from "@/lib/format";
import { LogoMark } from "./Logo";

export function SiteFooter({ updated }: { updated: string }) {
  return (
    <footer className="border-t border-rule bg-[rgb(5_7_13/0.85)]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-ink-3 sm:px-6">
        <span className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="font-semibold text-ink">AI Model Evolution</span> · updated {formatDate(updated)}
        </span>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/" className="link">
            Timeline
          </Link>
          <Link href="/explore" className="link">
            Explore
          </Link>
          <Link href="/story" className="link">
            Story
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
