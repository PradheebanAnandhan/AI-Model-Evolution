"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import type { Chapter } from "@/content/story";
import type { RibbonData } from "@/lib/ribbon";
import { ease } from "@/lib/motion";
import { useMediaQuery } from "../explorer/useMediaQuery";
import { EvolutionRibbon } from "./EvolutionRibbon";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const yearsOf = (c: Chapter) => {
  const a = c.from.slice(0, 4);
  const b = c.to.slice(0, 4);
  return a === b ? a : `${a}–${b}`;
};

export function Story(props: { data: RibbonData; chapters: Chapter[] }) {
  const desktop = useMediaQuery("(min-width: 768px)");
  // Remount on breakpoint changes so the scroll offsets are re-measured.
  return <StoryInner key={desktop ? "desktop" : "mobile"} {...props} desktop={desktop} />;
}

function StoryInner({ data, chapters, desktop }: { data: RibbonData; chapters: Chapter[]; desktop: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const n = chapters.length;
  const byId = new Map(data.models.map((m) => [m.id, m]));

  // On phones the chart sticks to the top half, so chapters activate lower, where their text is visible.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: desktop ? ["start center", "end center"] : ["start 76%", "end 76%"],
  });
  // Chapter index with "holds": the band rests on a chapter while its text is centred,
  // then glides to the next one between chapters.
  const raw = useTransform(scrollYProgress, (p) => {
    const f = Math.max(0, Math.min(n - 1, p * n - 0.5));
    const i = Math.floor(f);
    return i + smoothstep(0.3, 0.7, f - i);
  });
  const progress = useSpring(raw, { stiffness: 140, damping: 26, mass: 0.5 });
  useMotionValueEvent(raw, "change", (v) => {
    const next = Math.round(v);
    if (next !== active) setActive(next);
  });

  return (
    <section id="story" ref={ref} className="relative mt-24 scroll-mt-16 border-t border-rule" aria-label="How we got here">
      <div className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-6">
        <p className="kicker">The story so far</p>
        <h2 className="font-display mt-3 max-w-3xl text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">
          How we got here, in {n} chapters
        </h2>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:grid md:grid-cols-12 md:gap-12">
        <div className="sticky top-14 z-10 -mx-4 h-[46vh] bg-paper px-4 pb-3 pt-3 md:order-2 md:col-span-7 md:col-start-6 md:row-start-1 md:top-[10vh] md:mx-0 md:h-[80vh] md:bg-transparent md:p-0">
          <EvolutionRibbon data={data} chapters={chapters} progress={progress} active={active} />
        </div>

        <div className="relative md:order-1 md:col-span-5 md:col-start-1 md:row-start-1">
          {chapters.map((c, i) => (
            <motion.article
              key={c.id}
              className="flex min-h-[56vh] flex-col justify-center py-8 md:min-h-[88vh] md:py-12"
              animate={{ opacity: i === active ? 1 : 0.3 }}
              transition={{ duration: 0.45, ease: ease.out }}
            >
              <p className="kicker">
                Chapter {i + 1} · {yearsOf(c)}
              </p>
              <h3 className="font-display mt-2 text-[clamp(1.8rem,2.6vw,2.4rem)] font-semibold leading-[1.1] tracking-[-0.02em]">{c.title}</h3>
              <p className="font-display mt-4 text-[19px] leading-[1.6] text-ink-2">{c.body}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {c.models.map((id) => {
                  const mm = byId.get(id);
                  if (!mm) return null;
                  return (
                    <li key={id}>
                      <Link
                        href={`/explore?model=${id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-rule-2 bg-card px-3 py-1 text-[13px] font-medium text-ink transition-colors hover:border-ink"
                      >
                        <span className="size-2 rounded-full" style={{ background: mm.color }} aria-hidden="true" />
                        {mm.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
