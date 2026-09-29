import Link from "next/link";

const NAV = [
  { href: "/explore", label: "Timeline", short: "Timeline" },
  { href: "/#story", label: "Story", short: null },
  { href: "/about", label: "Methodology", short: "About" },
];

/** The masthead bar used on every page. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-display whitespace-nowrap text-[17px] font-semibold tracking-tight text-ink sm:text-[19px]">
          AI Model Evolution
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-[14px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-2 py-1.5 text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:px-2.5 ${n.short ? "" : "hidden sm:block"}`}
            >
              <span className="sm:hidden">{n.short}</span>
              <span className="hidden sm:inline">{n.label}</span>
            </Link>
          ))}
          <a
            href="/data/models.json"
            download
            className="ml-1 hidden rounded-md border border-rule-2 bg-card px-3 py-1.5 text-ink transition-colors hover:border-ink sm:inline-block"
          >
            Download data
          </a>
        </nav>
      </div>
    </header>
  );
}
