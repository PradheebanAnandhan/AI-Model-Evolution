"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCATE_EVENT } from "@/lib/events";
import { formatDate, formatParameters, formatTokens, OPENNESS_LABEL, TYPE_LABEL } from "@/lib/format";
import type { Model, Organization } from "@/lib/schema";
import { OrgBadge } from "./OrgBadge";

type SortKey = "name" | "org" | "releaseDate" | "type" | "openness" | "parameters" | "contextWindow";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "name", label: "Model" },
  { key: "org", label: "Lab" },
  { key: "releaseDate", label: "Released" },
  { key: "type", label: "Type", className: "hidden md:table-cell" },
  { key: "openness", label: "Openness", className: "hidden sm:table-cell" },
  { key: "parameters", label: "Parameters", className: "hidden lg:table-cell text-right" },
  { key: "contextWindow", label: "Context", className: "hidden lg:table-cell text-right" },
];

interface ListViewProps {
  models: Model[];
  organizations: Organization[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Right padding so rows aren't hidden under an overlaid panel. */
  rightInset?: number;
}

/** Every model as a sortable table. */
export function ListView({ models, organizations, selectedId, onSelect, rightInset = 0 }: ListViewProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "releaseDate", dir: -1 });
  const orgs = useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A model picked in the header search scrolls into view.
  useEffect(() => {
    const onLocate = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      requestAnimationFrame(() => scrollRef.current?.querySelector(`[data-row-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
    };
    window.addEventListener(LOCATE_EVENT, onLocate);
    return () => window.removeEventListener(LOCATE_EVENT, onLocate);
  }, []);

  const rows = useMemo(() => {
    const value = (m: Model): string | number => {
      switch (sort.key) {
        case "org":
          return orgs.get(m.org)?.name ?? m.org;
        case "parameters":
          return m.parameters.total ?? -1;
        case "contextWindow":
          return m.contextWindow ?? -1;
        default:
          return m[sort.key];
      }
    };
    return [...models].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return c * sort.dir || a.releaseDate.localeCompare(b.releaseDate);
    });
  }, [models, sort, orgs]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "releaseDate" ? -1 : 1 }));

  return (
    <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl" style={{ marginRight: rightInset || undefined }}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <caption className="sr-only">AI models, {rows.length} shown. Select a column header to sort.</caption>
          <thead className="sticky top-0 z-10 bg-[rgb(9_13_26)]">
            <tr className="border-b border-rule-2">
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className={`px-4 py-3 text-left ${c.className ?? ""}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${sort.key === c.key ? "text-white" : "text-ink-3 hover:text-ink"}`}
                    onClick={() => toggle(c.key)}
                  >
                    {c.label}
                    <span aria-hidden="true" className="w-2 text-[9px] text-accent">
                      {sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const org = orgs.get(m.org);
              const selected = m.id === selectedId;
              return (
                <tr
                  key={m.id}
                  data-row-id={m.id}
                  className={`cursor-pointer border-b border-rule transition-colors hover:bg-white/[0.04] ${selected ? "bg-[linear-gradient(90deg,rgb(143_125_255/0.2),rgb(143_125_255/0.04))]" : ""}`}
                  onClick={() => onSelect(m.id)}
                >
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      className="flex items-center gap-2.5 text-left font-semibold text-ink hover:text-white"
                      aria-current={selected ? "true" : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(m.id);
                      }}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: m.openness === "closed" ? "transparent" : org?.color, border: `2px solid ${org?.color}`, boxShadow: `0 0 8px ${org?.color}` }}
                        aria-hidden="true"
                      />
                      {m.name}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-2">
                    <span className="flex items-center gap-2">
                      {org && <OrgBadge org={org} size={22} />}
                      {org?.shortName ?? org?.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-2">{formatDate(m.releaseDate)}</td>
                  <td className="hidden px-4 py-2.5 text-ink-2 md:table-cell">{TYPE_LABEL[m.type]}</td>
                  <td className="hidden px-4 py-2.5 text-ink-2 sm:table-cell">{OPENNESS_LABEL[m.openness]}</td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-ink-2 lg:table-cell">
                    {m.parameters.disclosed ? formatParameters(m.parameters) : <span className="text-ink-3">—</span>}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-ink-2 lg:table-cell">
                    {m.contextWindow ? formatTokens(m.contextWindow) : <span className="text-ink-3">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-[14px] text-ink-3">No models match these filters.</p>}
      </div>
    </div>
  );
}
