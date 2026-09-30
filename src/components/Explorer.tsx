"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { Annotation } from "@/content/annotations";
import { LOCATE_EVENT } from "@/lib/events";
import { isFiltering, matchesFilters, parseViewState, serializeViewState, type Filters, type ViewState } from "@/lib/filters";
import { buildGraph } from "@/lib/graph";
import { buildIndex } from "@/lib/model-index";
import { MODEL_TYPES, type Dataset, type ModelType } from "@/lib/schema";
import { FilterBar } from "./explorer/FilterBar";
import { ModelPanel, PANEL_WIDTH } from "./explorer/ModelPanel";
import { useMediaQuery } from "./explorer/useMediaQuery";
import { ListView } from "./ListView";
import { Timeline } from "./timeline/Timeline";

interface ExplorerProps {
  dataset: Dataset;
  /** The chart on the Timeline page, the sortable table on Explore. */
  view: "timeline" | "list";
  /** Milestones: bigger nodes, and their labels win when space is short. */
  priorityIds?: string[];
  annotations?: Annotation[];
  /** Shown in the side panel on wide screens while nothing is picked. */
  featuredId?: string;
}

export function Explorer({ dataset, view, priorityIds = [], annotations = [], featuredId }: ExplorerProps) {
  const { models, organizations } = dataset;
  const params = useSearchParams();
  const wide = useMediaQuery("(min-width: 1280px)");
  const desktop = useMediaQuery("(min-width: 768px)");

  const known = useMemo(() => ({ orgs: new Set(organizations.map((o) => o.id)), models: new Set(models.map((m) => m.id)) }), [organizations, models]);
  // The URL is the single source of truth for filters and selection.
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
  // Type chips, most common first; types with no models are left out.
  const types = useMemo(() => {
    const count = (t: ModelType) => models.filter((m) => m.type === t).length;
    return MODEL_TYPES.filter((t) => count(t) > 0).sort((a, b) => count(b) - count(a));
  }, [models]);

  const filtering = isFiltering(state.filters);
  const matchIds = useMemo(() => (filtering ? new Set(models.filter((m) => matchesFilters(m, state.filters)).map((m) => m.id)) : null), [models, state.filters, filtering]);
  const shown = matchIds ? matchIds.size : models.length;

  const [centerRequest, setCenterRequest] = useState(() => (state.model ? { id: state.model, nonce: 0 } : undefined));
  // The year slider zooms the chart to its years (and a shared link opens on them).
  const [fitRequest, setFitRequest] = useState(() =>
    state.filters.from !== undefined || state.filters.to !== undefined ? { from: state.filters.from, to: state.filters.to, nonce: 0 } : undefined,
  );

  // A model picked in the header search is flown to.
  useEffect(() => {
    const onLocate = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setCenterRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }));
    };
    window.addEventListener(LOCATE_EVENT, onLocate);
    return () => window.removeEventListener(LOCATE_EVENT, onLocate);
  }, []);

  const select = useCallback(
    (id: string | undefined, opts: { center?: boolean } = {}) => {
      if (id === state.model) return;
      setState({ model: id }, "push");
      if (id && opts.center) setCenterRequest((r) => ({ id, nonce: (r?.nonce ?? 0) + 1 }));
    },
    [state.model, setState],
  );

  const setFilters = (filters: Filters) => {
    if (filters.from !== state.filters.from || filters.to !== state.filters.to) {
      setFitRequest((r) => ({ from: filters.from, to: filters.to, nonce: (r?.nonce ?? 0) + 1 }));
    }
    setState({ filters });
  };

  // A lab's card toggles "only this lab".
  const focusOrg = (orgId: string) => {
    const only = state.filters.orgs.length === 1 && state.filters.orgs[0] === orgId;
    setFilters({ ...state.filters, orgs: only ? [] : [orgId] });
  };

  // Escape closes the details unless focus is in a text field, the chart, or a dialog (they handle it).
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
  const featured = !selected && wide && featuredId ? modelById.get(featuredId) : undefined;
  const shownModel = selected ?? featured;
  const listModels = useMemo(() => (matchIds ? models.filter((m) => matchIds.has(m.id)) : models), [models, matchIds]);
  const rightInset = selected && desktop && !wide ? PANEL_WIDTH + 24 : 0;

  const panelProps = shownModel
    ? {
        model: shownModel,
        org: orgById.get(shownModel.org),
        incoming: graph.children.get(shownModel.id) ?? [],
        index,
        orgById,
        modelOrg: (id: string) => modelById.get(id)?.org,
        featured: !selected,
        onSelectModel: (id: string) => select(id, { center: true }),
        onClose: selected ? () => select(undefined) : undefined,
      }
    : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FilterBar filters={state.filters} organizations={organizations} types={types} years={years} shown={shown} total={models.length} onChange={setFilters} />

      <div className="relative flex h-[calc(100dvh-120px)] min-h-[520px] gap-4 px-3 pb-3 sm:px-6 lg:h-auto lg:min-h-0 lg:flex-1">
        <section aria-label={view === "timeline" ? "Interactive timeline of AI models" : "Table of AI models"} className="relative flex min-w-0 flex-1 flex-col">
          {view === "timeline" ? (
            <Timeline
              models={models}
              organizations={organizations}
              graph={graph}
              matchIds={matchIds}
              hideNonMatching={state.filters.hide}
              selectedId={state.model}
              featuredId={featured?.id}
              onSelect={(id) => select(id)}
              centerRequest={centerRequest}
              fitRequest={fitRequest}
              rightInset={rightInset}
              priorityIds={priority}
              annotations={annotations}
              focusedOrgs={state.filters.orgs}
              onFocusOrg={focusOrg}
            />
          ) : (
            <ListView models={listModels} organizations={organizations} selectedId={state.model} onSelect={(id) => select(id)} rightInset={rightInset} />
          )}
        </section>

        {wide && panelProps && <ModelPanel variant="column" {...panelProps} />}
        {!wide && <AnimatePresence>{selected && panelProps && <ModelPanel key="panel" variant={desktop ? "overlay" : "sheet"} {...panelProps} />}</AnimatePresence>}
      </div>
    </div>
  );
}
