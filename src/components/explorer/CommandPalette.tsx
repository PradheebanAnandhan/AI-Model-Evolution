"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Fuse from "fuse.js";
import { formatDate, TYPE_LABEL } from "@/lib/format";
import { ease, spring } from "@/lib/motion";
import type { Model, Organization } from "@/lib/schema";
import { SearchIcon } from "../icons";

interface CommandPaletteProps {
  models: Model[];
  organizations: Organization[];
  onPick: (id: string) => void;
}

/** The search field in the chart toolbar, and the ⌘K dialog it opens. */
export function CommandPalette({ models, organizations, onPick }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2.5 rounded-full border border-rule-2 bg-paper px-3.5 text-left text-[13.5px] text-ink-3 transition-colors hover:border-ink hover:text-ink-2"
        aria-haspopup="dialog"
      >
        <SearchIcon />
        <span className="flex-1 truncate">Find a model or lab</span>
        <kbd className="hidden rounded border border-rule-2 bg-card px-1.5 text-[11px] text-ink-3 sm:inline">⌘K</kbd>
      </button>
      <AnimatePresence>
        {open && (
          <Palette
            models={models}
            organizations={organizations}
            onPick={(id) => {
              onPick(id);
              setOpen(false);
            }}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Palette({ models, organizations, onPick, onClose }: CommandPaletteProps & { onClose: () => void }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const orgs = useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);

  const fuse = useMemo(
    () =>
      new Fuse(
        models.map((m) => ({ ...m, orgName: orgs.get(m.org)?.name ?? m.org })),
        {
          keys: [
            { name: "name", weight: 3 },
            { name: "aliases", weight: 2 },
            { name: "family", weight: 1 },
            { name: "orgName", weight: 1 },
            { name: "variants.name", weight: 1 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
        },
      ),
    [models, orgs],
  );

  const q = query.trim();
  const results = useMemo(
    () => (q ? fuse.search(q, { limit: 8 }).map((r) => r.item as Model) : [...models].reverse().slice(0, 6)),
    [fuse, q, models],
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-[rgb(27_26_23/0.28)]" onClick={onClose} aria-hidden="true" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Search models"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-rule bg-card shadow-[0_30px_80px_-20px_rgb(27_26_23/0.45)]"
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
          <kbd className="rounded border border-rule-2 px-1.5 text-[11px] text-ink-3">Esc</kbd>
        </div>

        <div className="px-4 pb-1 pt-3 text-[12px] font-medium text-ink-3">{q ? "Matches" : "Latest releases"}</div>
        <LayoutGroup id="palette">
          <ul id={listId} role="listbox" aria-label="Models" className="max-h-[50vh] overflow-y-auto px-2 pb-2">
            {results.length === 0 && <li className="px-3 py-6 text-center text-[14px] text-ink-3">No models match “{q}”.</li>}
            {results.map((m, i) => {
              const org = orgs.get(m.org);
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
                  {isActive && <motion.span layoutId="palette-highlight" transition={spring.snappy} className="absolute inset-0 rounded-lg bg-paper-2" />}
                  <span className="relative size-2.5 shrink-0 rounded-full" style={{ background: org?.color }} aria-hidden="true" />
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink">{m.name}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">
                      {org?.name} · {TYPE_LABEL[m.type]}
                    </span>
                  </span>
                  <span className="relative shrink-0 text-[12px] tabular-nums text-ink-3">{formatDate(m.releaseDate)}</span>
                </motion.li>
              );
            })}
          </ul>
        </LayoutGroup>
      </motion.div>
    </motion.div>
  );
}
