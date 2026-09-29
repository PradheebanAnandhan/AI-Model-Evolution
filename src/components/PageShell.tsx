import type { ReactNode } from "react";
import { getDataset } from "@/lib/data";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Header, centred reading column and footer for the static content pages. */
export function PageShell({ children }: { children: ReactNode }) {
  const updated = getDataset().models.reduce((d, m) => (m.updated > d ? m.updated : d), "");
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-12 sm:py-16">{children}</main>
      <SiteFooter updated={updated} />
    </div>
  );
}
