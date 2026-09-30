import type { ReactNode } from "react";
import { AnimatedNumber } from "./AnimatedNumber";
import { BookIcon, BranchIcon, BuildingIcon, CubeIcon } from "./icons";

export interface HeroStats {
  models: number;
  orgs: number;
  families: number;
  sources: number;
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 short:py-2">
      <span className="grid size-9 place-items-center rounded-xl border border-[rgb(157_140_255/0.3)] bg-[radial-gradient(circle_at_30%_25%,rgb(157_140_255/0.3),rgb(10_14_30/0.8))] text-[#c9bfff] shadow-[0_0_16px_-6px_rgb(143_125_255/0.9)]">
        {icon}
      </span>
      <div className="flex flex-col-reverse">
        <dt className="mt-1 text-[11.5px] text-ink-3">{label}</dt>
        <dd className="text-[19px] font-semibold leading-none tracking-[-0.02em] text-white">
          <AnimatedNumber value={value} from={0} duration={1.1} />
        </dd>
      </div>
    </div>
  );
}

/** The page title, a one-paragraph introduction, and the headline numbers. */
export function Hero({ title, accent, children, stats }: { title: string; accent: string; children: ReactNode; stats: HeroStats }) {
  return (
    <section className="flex items-end justify-between gap-8 px-4 pb-3 pt-5 sm:px-6 short:pt-3">
      <div className="min-w-0 max-w-[780px]">
        <h1 className="text-[clamp(1.75rem,3vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-white short:text-[clamp(1.6rem,2.4vw,2rem)]">
          {title} <span className="text-gradient">{accent}</span>
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2 sm:text-[14.5px] lg:short:hidden">{children}</p>
      </div>
      <dl className="glass hidden shrink-0 grid-cols-4 divide-x divide-rule rounded-2xl lg:grid">
        <Stat icon={<CubeIcon width={17} height={17} />} value={stats.models} label="Models" />
        <Stat icon={<BuildingIcon width={17} height={17} />} value={stats.orgs} label="Labs" />
        <Stat icon={<BranchIcon width={17} height={17} />} value={stats.families} label="Model families" />
        <Stat icon={<BookIcon width={17} height={17} />} value={stats.sources} label="Sources" />
      </dl>
    </section>
  );
}
