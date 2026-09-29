"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EMPTY_FILTERS, isFiltering, type Filters } from "@/lib/filters";
import { OPENNESS_LABEL, TYPE_LABEL } from "@/lib/format";
import { ease, spring } from "@/lib/motion";
import { MODALITIES, MODEL_TYPES, OPENNESS, type Organization } from "@/lib/schema";
import { AnimatedNumber } from "../AnimatedNumber";
import { ChevronIcon, FilterIcon } from "../icons";

interface FilterDockProps {
  filters: Filters;
  organizations: Organization[];
  years: [number, number];
  shown: number;
  total: number;
  onChange: (next: Filters) => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      transition={spring.snappy}
      className={`h-7 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
        pressed ? "border-ink bg-ink text-white" : "border-rule-2 bg-card text-ink-2 hover:border-ink hover:text-ink"
      }`}
    >
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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors ${
          count ? "border-ink bg-ink text-white" : "border-rule-2 bg-card text-ink-2 hover:border-ink hover:text-ink"
        }`}
      >
        {label}
        {count > 0 && <span className="tabular-nums opacity-80">{count}</span>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy} className="inline-flex">
          <ChevronIcon width={12} height={12} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18, ease: ease.out }}
            className="absolute left-0 top-full z-40 mt-1.5 max-h-80 w-64 overflow-auto rounded-xl border border-rule bg-card p-1 shadow-[0_12px_32px_-12px_rgb(27_26_23/0.25)]"
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
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-ink hover:bg-paper-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-[#1b1a17]" />
      {children}
    </label>
  );
}

const Divider = () => <span className="mx-1 hidden h-5 w-px bg-rule sm:block" aria-hidden="true" />;

export function FilterDock({ filters: f, organizations, years, shown, total, onChange }: FilterDockProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const yearOptions = Array.from({ length: years[1] - years[0] + 1 }, (_, i) => years[0] + i);
  const active = isFiltering(f);

  const counter = (
    <span className="text-[12.5px] text-ink-3" aria-live="polite">
      <AnimatedNumber value={shown} className="font-medium text-ink" /> of {total} models
    </span>
  );

  const selectCls = "h-7 rounded-full border border-rule-2 bg-card px-2.5 text-[12.5px] text-ink transition-colors hover:border-ink";

  return (
    <div className="border-b border-rule bg-card px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex h-8 items-center gap-2 rounded-full border border-rule-2 px-3 text-[13px] font-medium"
        >
          <FilterIcon /> Filters {active && <span className="size-1.5 rounded-full bg-accent" />}
        </button>
        {counter}
      </div>

      <div className={`${mobileOpen ? "flex" : "hidden"} mt-2 flex-wrap items-center gap-2 sm:mt-0 sm:flex`}>
        <Dropdown label="Lab" count={f.orgs.length}>
          {organizations.map((o) => (
            <Check key={o.id} checked={f.orgs.includes(o.id)} onChange={() => set({ orgs: toggle(f.orgs, o.id) })}>
              <span className="size-2.5 rounded-full" style={{ background: o.color }} aria-hidden="true" />
              {o.name}
            </Check>
          ))}
        </Dropdown>
        <Dropdown label="Type" count={f.types.length}>
          {MODEL_TYPES.map((t) => (
            <Check key={t} checked={f.types.includes(t)} onChange={() => set({ types: toggle(f.types, t) })}>
              {TYPE_LABEL[t]}
            </Check>
          ))}
        </Dropdown>

        <Divider />
        <div role="group" aria-label="Openness" className="flex flex-wrap gap-1.5">
          {OPENNESS.map((o) => (
            <Chip key={o} pressed={f.openness.includes(o)} onClick={() => set({ openness: toggle(f.openness, o) })}>
              {OPENNESS_LABEL[o]}
            </Chip>
          ))}
        </div>

        <Divider />
        <div role="group" aria-label="Modality" className="flex flex-wrap gap-1.5">
          {MODALITIES.map((m) => (
            <Chip key={m} pressed={f.modalities.includes(m)} onClick={() => set({ modalities: toggle(f.modalities, m) })}>
              {m[0].toUpperCase() + m.slice(1)}
            </Chip>
          ))}
        </div>

        <Divider />
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <label className="sr-only" htmlFor="year-from">
            From year
          </label>
          <select
            id="year-from"
            className={selectCls}
            value={f.from ?? ""}
            onChange={(e) => {
              const from = e.target.value ? Number(e.target.value) : undefined;
              set({ from, to: from !== undefined && f.to !== undefined && f.to < from ? from : f.to });
            }}
          >
            <option value="">From</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="year-to">
            To year
          </label>
          <select
            id="year-to"
            className={selectCls}
            value={f.to ?? ""}
            onChange={(e) => {
              const to = e.target.value ? Number(e.target.value) : undefined;
              set({ to, from: to !== undefined && f.from !== undefined && f.from > to ? to : f.from });
            }}
          >
            <option value="">To</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink">
            <input type="checkbox" checked={f.hide} onChange={() => set({ hide: !f.hide })} className="size-3.5 accent-[#1b1a17]" />
            Hide others
          </label>
          <span className="hidden sm:inline">{counter}</span>
          <AnimatePresence>
            {active && (
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-[12.5px] font-medium text-accent hover:underline"
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
