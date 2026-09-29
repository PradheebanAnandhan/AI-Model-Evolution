"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { scaleUtc } from "d3-scale";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Annotation } from "@/content/annotations";
import { lineage, type Edge, type Graph } from "@/lib/graph";
import { dateValue, formatDate, formatParameters, OPENNESS_LABEL, TYPE_LABEL } from "@/lib/format";
import { placeLabels, type Box, type LabelRequest } from "@/lib/labels";
import { layoutLanes } from "@/lib/layout";
import { ease } from "@/lib/motion";
import type { Model, Organization } from "@/lib/schema";
import { ChartHeader } from "./Axis";
import { Edges, type EdgePoint, type EdgeState } from "./Edges";
import { Legend } from "./Legend";
import { measureLabel, resetMeasureCache } from "./measure";
import { Navigator } from "./Navigator";
import { DOT_R, Station } from "./Station";
import { useTweener } from "./tween";

const ROW = 15;
const LANE_PAD = 15;
const DOT_SLOT = 13;
const LABEL_H = 15;
const RIGHT_PAD = 28;
/** Sub-row packing is recomputed only when zoom crosses a step of this ratio, so rows don't jitter. */
const ZOOM_STEP = 1.3;
const MAX_ZOOM = 80;
const GROW_MS = 1800;
const PLAY_MS = 14000;

/** The growth animation plays once per page load. */
let grownThisLoad = false;

export interface TimelineProps {
  models: Model[];
  organizations: Organization[];
  graph: Graph;
  /** Ids matching the active filters, or null when nothing is filtered. */
  matchIds: Set<string> | null;
  hideNonMatching: boolean;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  /** Pan/zoom to a model whenever the nonce changes. */
  centerRequest?: { id: string; nonce: number };
  /** Width covered on the right (e.g. by the detail panel); camera flights centre on the rest. */
  rightInset?: number;
  /** Models whose labels win when space is short. */
  priorityIds?: Set<string>;
  annotations?: Annotation[];
}

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export function Timeline({
  models,
  organizations,
  graph,
  matchIds,
  hideNonMatching,
  selectedId,
  onSelect,
  centerRequest,
  rightInset = 0,
  priorityIds,
  annotations = [],
}: TimelineProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const animRef = useRef(0);
  const clockRef = useRef(0);
  const growingRef = useRef(false);
  const handledNonce = useRef<number | undefined>(undefined);
  const width = useWidth(wrapperRef);
  const reduceMotion = useReducedMotion() ?? false;
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [hovered, setHovered] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const [today] = useState(() => new Date());
  // Bumped once web fonts load, so labels are re-measured with real metrics.
  const [, setFontsReady] = useState(false);

  const compact = width > 0 && width < 640;
  const gutter = compact ? 92 : 164;
  const left = gutter + 16;
  const right = Math.max(left + 120, width - RIGHT_PAD);

  const orgById = useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const colors = useMemo(() => new Map(organizations.map((o) => [o.id, o.color])), [organizations]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const dates = useMemo(() => new Map(models.map((m) => [m.id, dateValue(m.releaseDate)])), [models]);

  const [domainStart, domainEnd] = useMemo(() => {
    const times = [...dates.values()].map((d) => d.getTime());
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times, today.getTime()));
    return [
      new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth() - 4, 1)),
      // Extra room on the right so the newest labels aren't clipped.
      new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth() + 9, 1)),
    ];
  }, [dates, today]);

  // The time cursor: null means everything is shown; otherwise only models released by then.
  const [cursor, setCursor] = useState<number | null>(() =>
    typeof window !== "undefined" && !grownThisLoad && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? domainStart.getTime()
      : null,
  );
  const [playing, setPlaying] = useState(false);

  const base = useMemo(() => scaleUtc().domain([domainStart, domainEnd]).range([left, right]), [domainStart, domainEnd, left, right]);
  const x = useMemo(() => transform.rescaleX(base), [transform, base]);
  const packK = Math.pow(ZOOM_STEP, Math.floor(Math.log(transform.k) / Math.log(ZOOM_STEP) + 1e-6));

  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      resetMeasureCache();
      setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const hidden = useMemo(
    () => (hideNonMatching && matchIds ? new Set(models.filter((m) => !matchIds.has(m.id)).map((m) => m.id)) : new Set<string>()),
    [models, matchIds, hideNonMatching],
  );
  const visible = useMemo(() => models.filter((m) => !hidden.has(m.id)), [models, hidden]);
  const born = (id: string) => cursor === null || dates.get(id)!.getTime() <= cursor;

  const laneIds = useMemo(() => {
    const used = new Set(visible.map((m) => m.org));
    return organizations.filter((o) => used.has(o.id)).map((o) => o.id);
  }, [organizations, visible]);

  // Zoomed out, labels drop a lab-wide first word ("Claude Opus 4.7" -> "Opus 4.7"); the lane names the lab.
  const prefixes = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of organizations) {
      const names = models.filter((m) => m.org === o.id).map((m) => m.name);
      const counts = new Map<string, number>();
      for (const n of names) counts.set(n.split(" ")[0], (counts.get(n.split(" ")[0]) ?? 0) + 1);
      for (const [word, c] of counts) if (names.length >= 3 && c / names.length >= 0.6) map.set(o.id, word);
    }
    return map;
  }, [models, organizations]);
  const yearPx = (base(new Date(Date.UTC(2021, 0, 1))) - base(new Date(Date.UTC(2020, 0, 1)))) * packK;
  const compactLabels = yearPx < 260;
  const labelOf = useCallback(
    (m: Model) => {
      const prefix = prefixes.get(m.org);
      if (!compactLabels || !prefix || !m.name.startsWith(`${prefix} `)) return m.name;
      const rest = m.name.slice(prefix.length + 1);
      return rest.length >= 4 && /^[A-Za-z]/.test(rest) ? rest : m.name;
    },
    [compactLabels, prefixes],
  );

  const layout = useMemo(
    () =>
      layoutLanes(
        laneIds,
        visible.map((m) => ({ id: m.id, lane: m.org, label: m.name, x: base(dates.get(m.id)!) * packK, width: DOT_SLOT })),
        { rowHeight: ROW, lanePadding: LANE_PAD, gap: 0, top: 0 },
      ),
    [laneIds, visible, base, dates, packK],
  );

  // Row and lane positions glide to their new packing instead of jumping.
  const targets = useMemo(() => {
    const t = new Map<string, number>();
    for (const [id, box] of layout.nodes) t.set(id, box.y);
    for (const lane of layout.lanes) {
      t.set(`lane-y:${lane.id}`, lane.y);
      t.set(`lane-h:${lane.id}`, lane.height);
    }
    return t;
  }, [layout]);
  const tween = useTweener(targets, !reduceMotion);

  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // --- geometry ----------------------------------------------------------------

  const points = new Map<string, EdgePoint>();
  for (const m of models) {
    const y = tween.get(m.id) ?? layout.nodes.get(m.id)?.y;
    if (y === undefined) continue;
    points.set(m.id, { x: x(dates.get(m.id)!), y, org: m.org });
  }
  const bornPoints = new Map([...points].filter(([id]) => born(id)));

  const laneBoxes = organizations
    .map((o) => ({ org: o, y: tween.get(`lane-y:${o.id}`), h: tween.get(`lane-h:${o.id}`) }))
    .filter((l): l is { org: Organization; y: number; h: number } => l.y !== undefined && l.h !== undefined);
  const laneOf = new Map(laneBoxes.map((l) => [l.org.id, l]));

  const byLane = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of visible) {
      const list = map.get(m.org) ?? [];
      list.push(m.id);
      map.set(m.org, list);
    }
    for (const list of map.values()) list.sort((a, b) => dates.get(a)!.getTime() - dates.get(b)!.getTime());
    return map;
  }, [visible, dates]);

  const activeId = hovered ?? selectedId;
  const lineageSet = useMemo(() => (activeId ? lineage(graph, activeId) : null), [graph, activeId]);

  const nodeState = (id: string): "normal" | "dim" | "gone" => {
    if (hidden.has(id)) return "gone";
    if (lineageSet) return lineageSet.has(id) ? "normal" : "dim";
    if (matchIds && !matchIds.has(id)) return "dim";
    return "normal";
  };

  const edgeState = useCallback(
    (e: Edge): EdgeState => {
      if (hidden.has(e.from) || hidden.has(e.to)) return "gone";
      if (lineageSet) return lineageSet.has(e.from) && lineageSet.has(e.to) ? "active" : "dim";
      if (matchIds && (!matchIds.has(e.from) || !matchIds.has(e.to))) return "dim";
      return "normal";
    },
    [hidden, lineageSet, matchIds],
  );

  // Label priority: story milestones, then family roots, then the newest.
  const priorityOf = useCallback(
    (m: Model) => {
      const rank = priorityIds?.has(m.id) ? 0 : (graph.children.get(m.id)?.length ?? 0) >= 2 ? 1 : 2;
      return rank * 1e13 - dates.get(m.id)!.getTime();
    },
    [priorityIds, graph, dates],
  );

  // Direct labels, placed where there's room.
  const obstacles: (Box & { id: string })[] = [];
  const requests: LabelRequest[] = [];
  for (const m of visible) {
    const p = bornPoints.get(m.id);
    const lane = laneOf.get(m.org);
    if (!p || !lane) continue;
    obstacles.push({ id: m.id, x: p.x - DOT_R - 1, y: p.y - DOT_R - 1, w: DOT_R * 2 + 2, h: DOT_R * 2 + 2 });
    if (p.x < left - 4 || p.x > width + 4) continue;
    const strong = m.id === selectedId || m.id === hovered;
    requests.push({
      id: m.id,
      x: p.x,
      y: p.y,
      r: DOT_R,
      width: measureLabel(labelOf(m), 12, strong ? 600 : 500) + 2,
      height: LABEL_H,
      priority: priorityOf(m),
      bandTop: lane.y + 1,
      bandBottom: lane.y + lane.h - 1,
      force: strong,
    });
  }
  const placed = placeLabels(requests, obstacles, { minX: left + 2, maxX: width - 6 });

  // --- time: growth on first load, and Play ------------------------------------

  const runClock = useCallback(
    (duration: number, from: number) => {
      cancelAnimationFrame(clockRef.current);
      const start = domainStart.getTime();
      const end = today.getTime();
      const t0 = performance.now() - ((from - start) / (end - start)) * duration;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        if (p >= 1) {
          setCursor(null);
          setPlaying(false);
          return;
        }
        setCursor(start + (end - start) * p);
        clockRef.current = requestAnimationFrame(step);
      };
      clockRef.current = requestAnimationFrame(step);
    },
    [domainStart, today],
  );

  useEffect(() => {
    growingRef.current = cursor !== null && !playing;
  }, [cursor, playing]);

  useEffect(() => {
    if (!width || grownThisLoad) return;
    grownThisLoad = true;
    if (cursor !== null) runClock(GROW_MS, domainStart.getTime());
  }, [width, cursor, runClock, domainStart]);

  useEffect(() => () => cancelAnimationFrame(clockRef.current), []);

  // --- zoom & pan -----------------------------------------------------------

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !width) return;
    const sel = select(el);
    const z = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .clickDistance(4)
      // Plain wheel scrolls the lanes vertically; ctrl/cmd + wheel (and trackpad pinch) zooms.
      .filter((event: Event) => {
        if (event.type === "wheel") return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
        if (event.type === "dblclick") return false;
        return !(event as MouseEvent).button;
      })
      // Only the x axis moves, and the data can't be dragged out of view.
      .constrain((t) => {
        const minX = right * (1 - t.k);
        const maxX = left * (1 - t.k);
        const nx = Math.min(maxX, Math.max(minX, t.x));
        return nx === t.x && t.y === 0 ? t : zoomIdentity.translate(nx, 0).scale(t.k);
      })
      .on("zoom", (event: { transform: ZoomTransform }) => setTransform(event.transform));
    sel.call(z);
    el.style.touchAction = "pan-y";
    const first = zoomRef.current === null;
    zoomRef.current = z;
    if (first && width < 640) {
      // Phones open on the most recent years; the full history is one tap away on the navigator.
      const k = 2.6;
      z.transform(sel, zoomIdentity.translate(right * (1 - k), 0).scale(k));
    } else {
      // Re-apply the current transform under the new constraints (e.g. after a resize).
      z.transform(sel, zoomTransform(el));
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      const dx = e.shiftKey ? e.deltaY || e.deltaX : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!dx) return;
      e.preventDefault();
      z.translateBy(sel, -dx / zoomTransform(el).k, 0);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      sel.on(".zoom", null);
    };
  }, [width, left, right]);

  const viewMid = (left + Math.max(left + 120, right - rightInset)) / 2;

  const animateTo = useCallback(
    (targetK: number, center: Date, opts: { reveal?: string; instant?: boolean } = {}) => {
      const el = scrollRef.current;
      const z = zoomRef.current;
      if (!el || !z) return;
      cancelAnimationFrame(animRef.current);
      const start = zoomTransform(el);
      const mid = (left + Math.max(left + 120, right - rightInset)) / 2;
      const c0 = (mid - start.x) / start.k;
      const c1 = base(center);
      const k1 = Math.min(MAX_ZOOM, Math.max(1, targetK));
      const duration = reduceMotion || opts.instant ? 0 : 620;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = duration ? Math.min(1, (now - t0) / duration) : 1;
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const k = Math.exp(Math.log(start.k) + (Math.log(k1) - Math.log(start.k)) * e);
        const c = c0 + (c1 - c0) * e;
        z.transform(select(el), zoomIdentity.translate(mid - c * k, 0).scale(k));
        if (p < 1) {
          animRef.current = requestAnimationFrame(step);
        } else if (opts.reveal) {
          const reveal = opts.reveal;
          // Wait a frame for the re-packed layout, then bring the model's row into view.
          animRef.current = requestAnimationFrame(() => {
            const box = layoutRef.current.nodes.get(reveal);
            if (box && (box.y < el.scrollTop + 24 || box.y > el.scrollTop + el.clientHeight - 24)) {
              el.scrollTo({ top: box.y - el.clientHeight / 2, behavior: reduceMotion ? "auto" : "smooth" });
            }
          });
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [base, left, right, rightInset, reduceMotion],
  );

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // A model selected by clicking near the right edge would sit under the detail panel: slide it into view.
  const selectedX = selectedId ? points.get(selectedId)?.x : undefined;
  useEffect(() => {
    if (!selectedId || selectedX === undefined || !rightInset) return;
    if (selectedX > right - rightInset - 24) {
      const el = scrollRef.current;
      animateTo(el ? zoomTransform(el).k : 1, dates.get(selectedId)!);
    }
    // Only when the selection or the panel changes, not on every camera move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, rightInset]);

  useEffect(() => {
    if (!centerRequest || !width || handledNonce.current === centerRequest.nonce) return;
    const date = dates.get(centerRequest.id);
    if (!date) return;
    handledNonce.current = centerRequest.nonce;
    const k = scrollRef.current ? zoomTransform(scrollRef.current).k : 1;
    // On a deep link, let the growth animation finish first.
    const wait = growingRef.current ? GROW_MS : 0;
    const timer = setTimeout(() => animateTo(Math.max(k, 3), date, { reveal: centerRequest.id }), wait);
    return () => clearTimeout(timer);
  }, [centerRequest, width, dates, animateTo]);

  const zoomBy = (factor: number) => {
    const el = scrollRef.current;
    if (!el || !zoomRef.current) return;
    const t = zoomTransform(el);
    animateTo(t.k * factor, base.invert((viewMid - t.x) / t.k));
  };

  const resetZoom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const t = zoomTransform(el);
    animateTo(1, base.invert((viewMid - t.x) / t.k));
  };

  const togglePlay = () => {
    if (playing) {
      cancelAnimationFrame(clockRef.current);
      setPlaying(false);
      return;
    }
    if (reduceMotion) {
      setCursor(null);
      return;
    }
    resetZoom();
    setPlaying(true);
    runClock(PLAY_MS, cursor ?? domainStart.getTime());
  };

  // --- keyboard ----------------------------------------------------------------

  const tabTarget =
    focusedId && points.has(focusedId) && !hidden.has(focusedId)
      ? focusedId
      : selectedId && points.has(selectedId) && !hidden.has(selectedId)
        ? selectedId
        : visible[0]?.id;

  const focusModel = (id: string) => {
    const el = scrollRef.current?.querySelector<SVGGElement>(`[data-model-id="${CSS.escape(id)}"]`);
    el?.focus();
    const px = points.get(id)?.x;
    if (px !== undefined && (px < left + 10 || px > right - rightInset - 140)) animateTo(transform.k, dates.get(id)!);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = focusedId && points.has(focusedId) && !hidden.has(focusedId) ? focusedId : undefined;
    if (!current) return;
    const m = modelById.get(current)!;
    const lane = byLane.get(m.org) ?? [];
    const idx = lane.indexOf(current);
    let next: string | undefined;
    switch (e.key) {
      case "ArrowRight":
        next = lane[idx + 1];
        break;
      case "ArrowLeft":
        next = lane[idx - 1];
        break;
      case "Home":
        next = lane[0];
        break;
      case "End":
        next = lane[lane.length - 1];
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const li = laneIds.indexOf(m.org) + (e.key === "ArrowUp" ? -1 : 1);
        const target = byLane.get(laneIds[li]);
        if (target?.length) {
          const t = dates.get(current)!.getTime();
          next = target.reduce((best, id) =>
            Math.abs(dates.get(id)!.getTime() - t) < Math.abs(dates.get(best)!.getTime() - t) ? id : best,
          );
        }
        break;
      }
      case "Enter":
      case " ":
        e.preventDefault();
        onSelect(current);
        return;
      case "Escape":
        onSelect(undefined);
        return;
      default:
        return;
    }
    e.preventDefault();
    if (next) focusModel(next);
  };

  // --- render ---------------------------------------------------------------

  const ticks = x.ticks(Math.max(2, Math.floor((right - left) / 100)));
  const todayX = x(today);
  const cursorX = cursor === null ? null : x(new Date(cursor));
  const contentHeight = Math.max(layout.height, ...laneBoxes.filter((l) => laneIds.includes(l.org.id)).map((l) => l.y + l.h));
  const svgHeight = contentHeight + 8;
  const hoveredPoint = hovered ? bornPoints.get(hovered) : undefined;
  const hoveredModel = hovered ? modelById.get(hovered) : undefined;
  const view: [Date, Date] = [x.invert(left), x.invert(right)];
  const annotated = annotations
    .filter((a) => modelById.has(a.model))
    .map((a) => ({ ...a, date: modelById.get(a.model)!.releaseDate, t: dates.get(a.model)!.getTime() }));

  return (
    <div ref={wrapperRef} className="flex min-h-0 flex-1 flex-col">
      {width > 0 && (
        <>
          <div className="relative border-b border-rule">
            <ChartHeader x={x} width={width} left={left} today={today} cursor={cursor} annotations={annotated} onSelect={(id) => onSelect(id)} />
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              ref={scrollRef}
              className="absolute inset-0 cursor-grab overflow-y-auto overflow-x-hidden active:cursor-grabbing"
              role="group"
              aria-label="AI model timeline. Use the arrow keys to move between models and Enter to open one."
              onKeyDown={onKeyDown}
            >
              <div className="relative" style={{ height: svgHeight }}>
                <svg width={width} height={svgHeight} className="block">
                  <rect width={width} height={svgHeight} fill="#fff" onClick={() => onSelect(undefined)} />

                  <g pointerEvents="none" aria-hidden="true">
                    {laneBoxes.map(({ org, y, h }, i) => (
                      <rect
                        key={org.id}
                        y={y}
                        width={width}
                        height={h}
                        fill={i % 2 ? "#fbfaf7" : "#fff"}
                        className={`tl-fade ${laneIds.includes(org.id) ? "" : "tl-gone"}`}
                      />
                    ))}
                    {ticks.map((t) => {
                      const tx = x(t);
                      return tx > left - 4 ? <line key={t.getTime()} x1={tx} x2={tx} y2={svgHeight} stroke="#efece5" /> : null;
                    })}
                    {annotated
                      .filter((a) => cursor === null || a.t <= cursor)
                      .map((a) => {
                        const ax = x(new Date(a.t));
                        return ax > left ? <line key={a.model} x1={ax} x2={ax} y2={svgHeight} stroke="#b3ac9f" strokeDasharray="2 3" /> : null;
                      })}
                    {todayX > left && todayX < width && <line x1={todayX} x2={todayX} y2={svgHeight} stroke="#c8391f" strokeOpacity={0.7} />}
                    {cursorX !== null && cursorX > left && <line x1={cursorX} x2={cursorX} y2={svgHeight} stroke="#c8391f" strokeWidth={1.5} />}
                  </g>

                  {/* Tracks: one line per lab through its releases, like a transit line. */}
                  <g pointerEvents="none" aria-hidden="true" strokeLinecap="round">
                    {laneIds.map((lab) => {
                      const lane = laneOf.get(lab);
                      const xs = (byLane.get(lab) ?? []).filter((id) => bornPoints.has(id)).map((id) => bornPoints.get(id)!.x);
                      if (!lane || !xs.length) return null;
                      const y = lane.y + LANE_PAD + ROW / 2;
                      return (
                        <line
                          key={lab}
                          x1={Math.min(...xs)}
                          x2={Math.max(...xs)}
                          y1={y}
                          y2={y}
                          stroke={colors.get(lab)}
                          strokeOpacity={lineageSet ? 0.12 : 0.3}
                          strokeWidth={2.5}
                          className="tl-fade"
                        />
                      );
                    })}
                  </g>

                  <Edges edges={graph.edges} points={bornPoints} colors={colors} stateOf={edgeState} activeKey={activeId} />

                  <g>
                    {models.map((m) => {
                      const p = points.get(m.id);
                      if (!p) return null;
                      const org = orgById.get(m.org);
                      return (
                        <Station
                          key={m.id}
                          id={m.id}
                          ariaLabel={`${m.name}, ${org?.name ?? m.org}, released ${formatDate(m.releaseDate)}`}
                          x={p.x}
                          y={p.y}
                          color={colors.get(m.org) ?? "#57544d"}
                          open={m.openness !== "closed"}
                          selected={m.id === selectedId}
                          state={nodeState(m.id)}
                          born={born(m.id)}
                          tabbable={m.id === tabTarget}
                          onSelect={onSelect}
                          onHover={setHovered}
                          onFocusNode={setFocusedId}
                        />
                      );
                    })}
                  </g>

                  <g pointerEvents="none" aria-hidden="true">
                    {[...placed.values()].map((l) => {
                      const strong = l.id === selectedId || l.id === hovered;
                      const state = nodeState(l.id);
                      return (
                        <text
                          key={l.id}
                          x={l.x}
                          y={l.y + l.h / 2}
                          dominantBaseline="central"
                          fontSize={12}
                          fontWeight={strong ? 600 : 500}
                          fill={state === "dim" ? "#8a867d" : "#1b1a17"}
                          className={`tl-label tl-fade ${state === "dim" ? "tl-dim" : ""}`}
                        >
                          {labelOf(modelById.get(l.id)!)}
                        </text>
                      );
                    })}
                  </g>

                  {/* Lab gutter, drawn last so the chart slides underneath it. */}
                  <g>
                    <rect width={gutter} height={svgHeight} fill="#fff" />
                    <line x1={gutter + 0.5} x2={gutter + 0.5} y2={svgHeight} stroke="#e5e1d8" />
                    {laneBoxes.map(({ org, y, h }) => {
                      const count = byLane.get(org.id)?.length ?? 0;
                      const label = compact ? (org.shortName ?? org.name) : org.name;
                      const max = compact ? 10 : 20;
                      return (
                        <g key={org.id} transform={`translate(0,${y})`} className={`tl-fade ${laneIds.includes(org.id) ? "" : "tl-gone"}`}>
                          <line x2={width} y1={h - 0.5} y2={h - 0.5} stroke="#efece5" />
                          <circle cx={18} cy={LANE_PAD + ROW / 2} r={4.5} fill={org.color} />
                          <text x={29} y={LANE_PAD + ROW / 2} dy="0.35em" fontSize={compact ? 11.5 : 13} fontWeight={600} fill="#1b1a17">
                            {label.length > max ? `${label.slice(0, max - 1)}…` : label}
                          </text>
                          {h >= 44 && !compact && (
                            <text x={29} y={LANE_PAD + ROW / 2 + 16} dy="0.35em" fontSize={11.5} fill="#8a867d">
                              {count} {count === 1 ? "model" : "models"}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>

                <AnimatePresence>
                  {hoveredModel && hoveredPoint && (
                    <motion.div
                      key={hoveredModel.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.16, ease: ease.out }}
                      className="pointer-events-none absolute z-20 w-72 rounded-xl border border-rule bg-card p-3.5 shadow-[0_10px_30px_-10px_rgb(27_26_23/0.25)]"
                      style={{
                        // Below the dot's row, so its own label stays readable.
                        left: Math.min(Math.max(hoveredPoint.x - 16, gutter + 8), width - 300),
                        top: hoveredPoint.y + 16,
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                        <span className="size-2 rounded-full" style={{ background: colors.get(hoveredModel.org) }} />
                        {orgById.get(hoveredModel.org)?.name} · {formatDate(hoveredModel.releaseDate)}
                      </div>
                      <div className="font-display mt-1 text-[17px] font-semibold leading-snug text-ink">{hoveredModel.name}</div>
                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{hoveredModel.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ink-3">
                        <span>{TYPE_LABEL[hoveredModel.type]}</span>
                        <span>{OPENNESS_LABEL[hoveredModel.openness]}</span>
                        <span>{formatParameters(hoveredModel.parameters)}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-rule px-4 py-3">
            <Navigator
              domain={[domainStart, domainEnd]}
              view={view}
              width={width - 32}
              marks={visible.map((m) => ({
                id: m.id,
                date: dates.get(m.id)!,
                color: colors.get(m.org) ?? "#57544d",
                dim: matchIds ? !matchIds.has(m.id) : false,
              }))}
              playing={playing}
              cursor={cursor}
              onPlayToggle={togglePlay}
              onCenter={(date) => animateTo(transform.k, date, { instant: true })}
              onZoom={zoomBy}
              onReset={resetZoom}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Legend />
              <p className="hidden text-[12px] text-ink-3 lg:block">
                Labels appear where there&apos;s room. Hover a dot, or zoom in with Ctrl/⌘ + scroll, to see more.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
