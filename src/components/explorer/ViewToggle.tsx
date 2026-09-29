"use client";

import { motion } from "motion/react";
import type { View } from "@/lib/filters";
import { spring } from "@/lib/motion";

const OPTIONS: { value: View; label: string }[] = [
  { value: "timeline", label: "Timeline" },
  { value: "list", label: "Table" },
];

/** Tabs in the style of a data publication: text with a sliding underline. */
export function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div role="tablist" aria-label="View" className="flex items-center gap-1">
      {OPTIONS.map(({ value: v, label }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`relative px-2.5 py-3 text-[14px] font-medium transition-colors ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}
          >
            {label}
            {active && <motion.span layoutId="view-tab-underline" transition={spring.snappy} className="absolute inset-x-2 -bottom-px h-[2px] bg-ink" />}
          </button>
        );
      })}
    </div>
  );
}
