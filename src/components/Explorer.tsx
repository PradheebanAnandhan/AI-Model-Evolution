"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Annotation } from "@/content/annotations";
import { buildGraph } from "@/lib/graph";
import { isFiltering, matchesFilters, parseViewState, serializeViewState, type Filters, type View, type ViewState } from "@/lib/filters";
import { buildIndex } from "@/lib/model-index";
import type { Dataset } from "@/lib/schema";
import { CommandPalette } from "./explorer/CommandPalette";
import { DetailPanel, PANEL_WIDTH } from "./explorer/DetailPanel";
import { FilterDock } from "./explorer/FilterDock";
import { useMediaQuery } from "./explorer/useMediaQuery";
import { ViewToggle } from "./explorer/ViewToggle";
import { ExpandIcon } from "./icons";
import { ListView } from "./ListView";
import { Timeline } from "./timeline/Timeline";

interface ExplorerProps {
  dataset: Dataset;
  /** `embedded` sits inside the home page; `full` fills the screen at /explore. */
  variant: "embedded" | "full";
  /** Story milestones: their labels win when space is short. */
  priorityIds?: string[];
  annotations?: Annotation[];
}

export function Explorer({ dataset, variant, priorityIds = [], annotations = [] }: ExplorerProps) {
  const { models, organizations } = dataset;
  const params = useSearchParams();
  const desktop = useMediaQuery("(min-width: 768px)");

  const known = useMemo(
    () => ({ orgs: new Set(organizations.map((o) => o.id)), models: new Set(models.map((m) => m.id)) }),
    [organizations, models],
  );
  // The URL is the single source of truth for filters, view and selection.
  const state = useMemo(() => parseViewState(new URLSearchParams(params.toString()), known), [params, known]);

  const setState = useCallback(
    (patch: Partial<ViewState>, mode: "push" | "replace" = "replace") => {
      const qs = serializeViewState({ ...state, ...patch });
      const url = qs ? `?${qs}` : window.location.pathname;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [state],
  );

  const graph = useMemo(() => buildGraph(models), [models]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const orgById = useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const index = useMemo(() => buildIndex(models, organizations), [models, organizations]);
  const priority = useMemo(() => new Set(priorityIds), [priorityIds]);
  const years = useMemo<[number, number]>(() => {
    const ys = models.map((m) => Number(m.releaseDate.slice(0, 4)));
    return [Math.min(...ys), Math.max(...ys)];
  }, [models]);

  const filtering = isFiltering(state.filters);
  const matchIds = useMemo(
    () => (filtering ? new Set(models.filter((m) => matchesFilters(m, state.filters)).map((m) => m.id)) : null),
    [models, state.filters, filtering],
  );
  const shown = matchIds ? matchIds.size : models.length;

  const [centerRequest, setCenterRequest] = useState(() => (state.model ? { id: state.model, nonce: 0 } : undefined));

  const select = useCallback(
    (id: string | undefined, opts: { center?: boolean } = {}) => {
      if (id === state.model) return;
      setState({ model: id }, "push");
      if (id && opts.center) setCenterRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [state.model, setState],
  );

  const setFilters = (filters: Filters) => setState({ filters });
  const setView = (view: View) => {
    setState({ view });
    if (view === "timeline" && state.model) setCenterRequest((r) => ({ id: state.model!, nonce: (r?.nonce ?? 0) + 1 }));
  };

  // Escape closes the details panel unless focus is in a text field, the chart, or a dialog (they handle it).
  useEffect(() => {
    if (!state.model) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "Escape" || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("[role=group],[role=dialog]")) return;
      setState({ model: undefined }, "push");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.model, setState]);

  const selected = state.model ? modelById.get(state.model) : undefined;
  const listModels = useMemo(() => (matchIds ? models.filter((m) => matchIds.has(m.id)) : models), [models, matchIds]);
  const rightInset = selected && desktop ? PANEL_WIDTH : 0;
  const embedded = variant === "embedded";
  const qs = params.toString();

  return (
    <section
      aria-label="Interactive timeline of AI models"
      className={
        embedded
          ? "card relative flex flex-col overflow-hidden"
          : "relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-rule bg-card"
      }
      style={embedded ? { height: "min(900px, calc(100dvh - 72px))", minHeight: 600 } : undefined}
    >
      <div className="flex items-center gap-3 border-b border-rule px-3 sm:px-4">
        <ViewToggle value={state.view} onChange={setView} />
        <div className="flex min-w-0 flex-1 justify-center py-2">
          <CommandPalette models={models} organizations={organizations} onPick={(id) => select(id, { center: true })} />
        </div>
        {embedded ? (
          <Link
            href={`/explore${qs ? `?${qs}` : ""}`}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:inline-flex"
          >
            <ExpandIcon width={14} height={14} /> Full screen
          </Link>
        ) : (
          <span className="hidden text-[13px] text-ink-3 sm:inline">{models.length} models</span>
        )}
      </div>

      <FilterDock filters={state.filters} organizations={organizations} years={years} shown={shown} total={models.length} onChange={setFilters} />

      <div className="relative flex min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.view}
            className="flex min-w-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {state.view === "timeline" ? (
              <Timeline
                models={models}
                organizations={organizations}
                graph={graph}
                matchIds={matchIds}
                hideNonMatching={state.filters.hide}
                selectedId={state.model}
                onSelect={(id) => select(id)}
                centerRequest={centerRequest}
                rightInset={rightInset}
                priorityIds={priority}
                annotations={annotations}
              />
            ) : (
              <ListView models={listModels} organizations={organizations} selectedId={state.model} onSelect={(id) => select(id)} rightInset={rightInset} />
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {selected && (
            <DetailPanel
              key="detail"
              model={selected}
              org={orgById.get(selected.org)}
              incoming={graph.children.get(selected.id) ?? []}
              index={index}
              desktop={desktop}
              onSelectModel={(id) => select(id, { center: true })}
              onClose={() => select(undefined)}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
