"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Timeline" },
  { href: "/explore", label: "Explore" },
  { href: "/story", label: "Story" },
  { href: "/about", label: "About" },
];

/** The main navigation; the current page's tab glows. */
export function NavTabs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Main" className={`flex items-center gap-1 ${className}`}>
      {TABS.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${active ? "text-white" : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"}`}
          >
            {active && (
              <>
                <span className="absolute inset-0 rounded-lg bg-[linear-gradient(180deg,rgb(143_125_255/0.26),rgb(143_125_255/0.06))] ring-1 ring-inset ring-[rgb(157_140_255/0.35)]" />
                <span className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-[linear-gradient(90deg,#9d8cff,#5f8dff)] shadow-[0_0_12px_2px_rgb(143_125_255/0.7)]" />
              </>
            )}
            <span className="relative">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
