import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { Model } from "@/lib/schema";

/**
 * Shown until the chart starts in the browser (it reads its state from the URL). Screen readers
 * and crawlers get every model as a link; everyone else sees a short loading state.
 */
export function ChartFallback({ models, label }: { models: Model[]; label: string }) {
  return (
    <div className="flex min-h-[520px] flex-1 px-3 pb-4 sm:px-6">
      <div className="glass flex flex-1 items-center justify-center rounded-2xl">
        <p className="flex items-center gap-3 text-[14px] text-ink-3">
          <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" aria-hidden="true" />
          {label}
        </p>
      </div>
      <nav aria-label="All models" className="sr-only">
        <ul>
          {[...models].reverse().map((m) => (
            <li key={m.id}>
              <Link href={`/models/${m.id}`}>
                {m.name}, {formatDate(m.releaseDate)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
