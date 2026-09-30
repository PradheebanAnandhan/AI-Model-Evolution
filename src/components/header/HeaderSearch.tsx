"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Fuse from "fuse.js";
import { LOCATE_EVENT } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { ease, spring } from "@/lib/motion";
import { SearchIcon } from "../icons";

export interface SearchItem {
  id: string;
  name: string;
  aliases: string[];
  family: string;
  orgName: string;
  color: string;
  type: string;
  date: string;
  variants: string[];
}

/** Pages that show the chart handle a pick in place; others open the timeline. */
const CHART_PAGES = new Set(["/", "/explore"]);

/** The header's search field and the ⌘K dialog it opens. `items` are newest first. */
export function HeaderSearch({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // ⌘K / Ctrl+K anywhere, or "/" outside text fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const inField = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !inField)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const pick = (id: string) => {
    setOpen(false);
    if (CHART_PAGES.has(pathname)) {
      const params = new URLSearchParams(window.location.search);
      params.set("model", id);
      window.history.pushState(null, "", `?${params.toString().replace(/%2C/g, ",")}`);
      window.dispatchEvent(new CustomEvent(LOCATE_EVENT, { detail: id }));
    } else {
      router.push(`/?model=${encodeURIComponent(id)}`);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2.5 rounded-xl border border-rule bg-glass px-3 text-left text-[13.5px] text-ink-3 transition-colors hover:border-rule-2 hover:text-ink-2 sm:w-[min(340px,34vw)] sm:px-3.5"
        aria-haspopup="dialog"
        aria-label="Search models and labs"
      >
        <SearchIcon width={17} height={17} />
        <span className="hidden flex-1 truncate sm:inline">Search models, labs, families…</span>
        <kbd className="hidden rounded-md border border-rule-2 bg-white/[0.03] px-1.5 py-0.5 text-[11px] font-medium text-ink-3 sm:inline">⌘K</kbd>
      </button>
      <AnimatePresence>{open && <Palette items={items} onPick={pick} onClose={close} />}</AnimatePresence>
    </>
  );
}

function Palette({ items, onPick, onClose }: { items: SearchItem[]; onPick: (id: string) => void; onClose: () => void }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: [
          { name: "name", weight: 3 },
          { name: "aliases", weight: 2 },
          { name: "family", weight: 1 },
          { name: "orgName", weight: 1 },
          { name: "variants", weight: 1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      }),
    [items],
  );

  const q = query.trim();
  const results = useMemo(() => (q ? fuse.search(q, { limit: 8 }).map((r) => r.item) : items.slice(0, 6)), [fuse, q, items]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      <div className="absolute inset-0 bg-[rgb(2_4_10/0.72)]" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Search models"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-rule-2 bg-card shadow-[0_40px_100px_-20px_rgb(0_0_0/0.9),0_0_0_1px_rgb(157_140_255/0.08),0_0_60px_-20px_rgb(143_125_255/0.5)]"
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -4 }}
        transition={spring.snappy}
      >
        <div className="flex items-center gap-3 border-b border-rule px-4">
          <SearchIcon className="text-ink-3" width={18} height={18} />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder="Search models, labs, families…"
            className="h-14 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-3 focus:outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                onPick(results[active].id);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
          />
          <kbd className="rounded-md border border-rule-2 px-1.5 text-[11px] text-ink-3">Esc</kbd>
        </div>

        <div className="px-4 pb-1 pt-3 text-[12px] font-medium text-ink-3">{q ? "Matches" : "Latest releases"}</div>
        <LayoutGroup id="palette">
          <ul id={listId} role="listbox" aria-label="Models" className="max-h-[50vh] overflow-y-auto px-2 pb-2">
            {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-ink-3">No models match “{q}”.</li>}
            {results.map((m, i) => {
              const isActive = i === active;
              return (
                <motion.li
                  key={m.id}
                  id={`${listId}-${m.id}`}
                  role="option"
                  aria-selected={isActive}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: ease.out, delay: i * 0.02 }}
                  className="relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(m.id);
                  }}
                >
                  {isActive && <motion.span layoutId="palette-highlight" transition={spring.snappy} className="absolute inset-0 rounded-lg bg-white/[0.06] ring-1 ring-inset ring-rule" />}
                  <span className="relative size-2.5 shrink-0 rounded-full" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} aria-hidden="true" />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink">{m.name}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {m.orgName} · {m.type}
                    </span>
                  </span>
                  <span className="relative shrink-0 text-[12px] tabular-nums text-ink-3">{formatDate(m.date)}</span>
                </motion.li>
              );
            })}
          </ul>
        </LayoutGroup>
      </motion.div>
    </motion.div>
  );
}
