"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EMPTY_FILTERS, isFiltering, type Filters } from "@/lib/filters";
import { OPENNESS_LABEL, TYPE_SHORT } from "@/lib/format";
import { ease, spring } from "@/lib/motion";
import { MODALITIES, OPENNESS, type ModelType, type Organization } from "@/lib/schema";
import { AnimatedNumber } from "../AnimatedNumber";
import { ChevronIcon, FilterIcon } from "../icons";
import { YearRange } from "./YearRange";

interface FilterBarProps {
  filters: Filters;
  organizations: Organization[];
  /** Model types present in the data, most common first. */
  types: ModelType[];
  years: [number, number];
  shown: number;
  total: number;
  onChange: (next: Filters) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const pill = "h-9 shrink-0 rounded-xl border px-3.5 text-[13px] font-medium transition-[background-color,border-color,color,box-shadow]";
const pillOn = "border-[rgb(157_140_255/0.6)] bg-[linear-gradient(180deg,rgb(143_125_255/0.32),rgb(95_141_255/0.14))] text-white shadow-[0_0_18px_-6px_rgb(143_125_255/0.9)]";
const pillOff = "border-rule bg-glass text-ink-2 hover:border-rule-2 hover:text-ink";

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button type="button" aria-pressed={pressed} onClick={onClick} whileTap={{ scale: 0.95 }} transition={spring.snappy} className={`${pill} ${pressed ? pillOn : pillOff}`}>
      {children}
    </motion.button>
  );
}

function Dropdown({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${pill} inline-flex items-center gap-2 ${count ? pillOn : pillOff}`}>
        {label}
        {count > 0 && <span className="rounded-md bg-white/15 px-1.5 text-[11.5px] tabular-nums">{count}</span>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="inline-flex text-ink-3">
          <ChevronIcon width={13} height={13} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: ease.out }}
            className="absolute left-0 top-full z-40 mt-2 max-h-80 w-64 overflow-auto rounded-xl border border-rule-2 bg-card p-1 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-ink hover:bg-white/[0.06]">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-[#9d8cff]" />
      {children}
    </label>
  );
}

/** Type chips, dropdowns for lab, openness and modality, the year range, and the result count. */
export function FilterBar({ filters: f, organizations, types, years, shown, total, onChange }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const active = isFiltering(f);

  const counter = (
    <span className="whitespace-nowrap text-[12.5px] text-ink-3" aria-live="polite">
      <AnimatedNumber value={shown} className="font-semibold text-ink" /> of {total} models
    </span>
  );

  return (
    <div className="px-3 pb-3 sm:px-6">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <button type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)} className={`${pill} inline-flex items-center gap-2 ${pillOff}`}>
          <FilterIcon /> Filters {active && <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />}
        </button>
        {counter}
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden"} mt-2 flex-wrap items-center gap-2 md:mt-0 md:flex md:flex-nowrap`}>
        <div
          role="group"
          aria-label="Model type"
          className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 pl-1 pr-5 [mask-image:linear-gradient(to_right,#000_calc(100%-20px),transparent)] [scrollbar-width:none] max-md:w-full"
        >
          <Chip pressed={f.types.length === 0} onClick={() => set({ types: [] })}>
            All
          </Chip>
          {types.map((t) => (
            <Chip key={t} pressed={f.types.includes(t)} onClick={() => set({ types: toggle(f.types, t) })}>
              {TYPE_SHORT[t]}
            </Chip>
          ))}
        </div>

        <span className="mx-1 hidden h-6 w-px shrink-0 bg-rule-2 md:block" aria-hidden="true" />

        <Dropdown label={f.orgs.length ? "Labs" : "All labs"} count={f.orgs.length}>
          {organizations.map((o) => (
            <Check key={o.id} checked={f.orgs.includes(o.id)} onChange={() => set({ orgs: toggle(f.orgs, o.id) })}>
              <span className="size-2.5 rounded-full" style={{ background: o.color, boxShadow: `0 0 8px ${o.color}` }} aria-hidden="true" />
              {o.name}
            </Check>
          ))}
        </Dropdown>
        <Dropdown label="Openness" count={f.openness.length}>
          {OPENNESS.map((o) => (
            <Check key={o} checked={f.openness.includes(o)} onChange={() => set({ openness: toggle(f.openness, o) })}>
              {OPENNESS_LABEL[o]}
            </Check>
          ))}
        </Dropdown>
        <Dropdown label="Modality" count={f.modalities.length}>
          {MODALITIES.map((m) => (
            <Check key={m} checked={f.modalities.includes(m)} onChange={() => set({ modalities: toggle(f.modalities, m) })}>
              {m[0].toUpperCase() + m.slice(1)}
            </Check>
          ))}
        </Dropdown>

        <YearRange min={years[0]} max={years[1]} from={f.from} to={f.to} onChange={(from, to) => set({ from, to })} />

        <div className="ml-auto flex shrink-0 items-center gap-3 pl-1">
          <span className="hidden 2xl:inline">{counter}</span>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2 hover:text-ink">
            <input type="checkbox" checked={f.hide} onChange={() => set({ hide: !f.hide })} className="peer sr-only" />
            <span
              aria-hidden="true"
              className="relative h-5 w-9 rounded-full border border-rule-2 bg-white/[0.06] transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3.5 after:rounded-full after:bg-ink-3 after:transition-transform peer-checked:border-[rgb(157_140_255/0.6)] peer-checked:bg-[rgb(143_125_255/0.35)] peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-focus"
            />
            Hide others
          </label>
          <AnimatePresence>
            {active && (
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[12.5px] font-semibold text-accent hover:underline"
                onClick={() => onChange({ ...EMPTY_FILTERS, hide: f.hide })}
              >
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
