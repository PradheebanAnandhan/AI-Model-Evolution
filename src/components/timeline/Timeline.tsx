"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, zoomTransform, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Annotation } from "@/content/annotations";
import { dateValue, formatDate, formatParameters, OPENNESS_LABEL, TYPE_LABEL } from "@/lib/format";
import { lineage, type Edge, type Graph } from "@/lib/graph";
import { placeLabels, sideCandidates, type Box, type LabelRequest } from "@/lib/labels";
import { assignSlots, slotOffset } from "@/lib/layout";
import { ease } from "@/lib/motion";
import { buildRows, type TimelineRow } from "@/lib/rows";
import type { Model, Organization } from "@/lib/schema";
import { buildTimeScale, type ScaleMode } from "@/lib/timescale";
import { ChevronIcon } from "../icons";
import { GroupBadge, OrgBadge } from "../OrgBadge";
import { Axis, AXIS_H } from "./Axis";
import { BottomBar, type MinimapData } from "./BottomBar";
import { Edges, FlowLines, type EdgePoint, type EdgeState } from "./Edges";
import { measureLabel, resetMeasureCache } from "./measure";
import { Node, nodeRadius } from "./Node";
import { useTweener } from "./tween";

const GUTTER = 208;
const GUTTER_MEDIUM = 184;
const GUTTER_COMPACT = 60;
const PLOT_GAP = 26;
const RIGHT_PAD = 22;
const ROW_MIN = 56;
const ROW_MAX = 104;
const HEADER_H = 40;
const LABEL_H = 30;
/** Nodes closer than this on a row's line are spread onto parallel lines. */
const NODE_GAP = 14;
/** Slots are recomputed only when zoom crosses a step of this ratio, so nodes don't jitter. */
const ZOOM_STEP = 1.3;
const MAX_ZOOM = 40;
const GROW_MS = 2000;
const PLAY_MS = 16000;
const MORPH_MS = 700;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The growth animation plays once per page load. */
let grownThisLoad = false;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rowId = (r: TimelineRow) => `${r.kind}:${r.key}`;
const svgId = (s: string) => s.replace(/[^a-zA-Z0-9-]/g, "_");

export interface TimelineProps {
  models: Model[];
  organizations: Organization[];
  graph: Graph;
  /** Ids matching the active filters, or null when nothing is filtered. */
  matchIds: Set<string> | null;
  hideNonMatching: boolean;
  /** The model the reader picked; its lineage is highlighted. */
  selectedId?: string;
  /** Shown in the side panel while nothing is picked: marked on the chart, but nothing is dimmed. */
  featuredId?: string;
  onSelect: (id: string | undefined) => void;
  /** Pan/zoom to a model whenever the nonce changes. */
  centerRequest?: { id: string; nonce: number };
  /** Fit these years (inclusive) to the view whenever the nonce changes; missing ends mean the whole range. */
  fitRequest?: { from?: number; to?: number; nonce: number };
  /** Width covered on the right (e.g. by an overlaid panel); camera moves centre on the rest. */
  rightInset?: number;
  /** Milestones: bigger nodes, and their labels win when space is short. */
  priorityIds?: Set<string>;
  annotations?: Annotation[];
  /** Labs picked in the lab filter; their cards show as pressed. */
  focusedOrgs?: string[];
  onFocusOrg?: (orgId: string) => void;
}

export function Timeline({
  models,
  organizations,
  graph,
  matchIds,
  hideNonMatching,
  selectedId,
  featuredId,
  onSelect,
  centerRequest,
  fitRequest,
  rightInset = 0,
  priorityIds,
  annotations = [],
  focusedOrgs = [],
  onFocusOrg,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const animRef = useRef(0);
  const clockRef = useRef(0);
  const morphRef = useRef(0);
  const scrollRaf = useRef(0);
  const growingRef = useRef(false);
  const handledCenter = useRef<number | undefined>(undefined);
  const handledFit = useRef<number | undefined>(undefined);
  const pendingCenter = useRef<Date | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  // The zoom level nodes are spaced for. It updates when a zoom settles, so nodes re-space once
  // rather than gliding while the camera moves (which would render the chart twice a frame).
  const [settledK, setSettledK] = useState(1);
  const animatingRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [hovered, setHovered] = useState<string>();
  const [focusedId, setFocusedId] = useState<string>();
  const [today] = useState(() => new Date());
  const [mode, setMode] = useState<ScaleMode>("activity");
  const [morph, setMorph] = useState<{ from: (d: Date) => number; p: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Bumped once web fonts load, so labels are re-measured with real metrics.
  const [, setFontsReady] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const { w: width, h: height } = size;
  const compact = width > 0 && width < 640;
  const gutter = compact ? GUTTER_COMPACT : width < 1000 ? GUTTER_MEDIUM : GUTTER;
  const left = gutter + PLOT_GAP;
  const right = Math.max(left + 160, width - RIGHT_PAD);
  const fade = `linear-gradient(to right, transparent ${gutter - 24}px, #000 ${gutter + 12}px)`;

  const orgById = useMemo(() => new Map(organizations.map((o) => [o.id, o])), [organizations]);
  const colors = useMemo(() => new Map(organizations.map((o) => [o.id, o.color])), [organizations]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const dates = useMemo(() => new Map(models.map((m) => [m.id, dateValue(m.releaseDate)])), [models]);
  const times = useMemo(() => models.map((m) => dates.get(m.id)!.getTime()), [models, dates]);

  // --- time ------------------------------------------------------------------

  const base = useMemo(() => buildTimeScale(times, mode, [left, right], today.getTime()), [times, mode, left, right, today]);
  const baseRef = useRef(base);
  useEffect(() => {
    baseRef.current = base;
  }, [base]);
  const bounds = useMemo(() => base.domain(), [base]);
  const startT = bounds[0].getTime();
  const endT = bounds[bounds.length - 1].getTime();
  const years = useMemo(() => bounds.slice(0, -1).map((d) => d.getUTCFullYear()), [bounds]);
  const extent = useMemo<[Date, Date]>(() => [new Date(startT), new Date(endT)], [startT, endT]);

  const xOf = (d: Date) => {
    const target = transform.applyX(base(d));
    if (!morph) return target;
    const from = morph.from(d);
    return from + (target - from) * easeInOut(morph.p);
  };
  const dateAt = (px: number) => base.invert(transform.invertX(px));
  const yearPx = (y: number) => (base(new Date(Date.UTC(y + 1, 0, 1))) - base(new Date(Date.UTC(y, 0, 1)))) * transform.k;
  const packK = Math.pow(ZOOM_STEP, Math.floor(Math.log(settledK) / Math.log(ZOOM_STEP) + 1e-6));

  // The time cursor: null means everything is shown; otherwise only models released by then.
  const [cursor, setCursor] = useState<number | null>(() =>
    typeof window !== "undefined" && !grownThisLoad && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? Number.NEGATIVE_INFINITY : null,
  );
  const [playing, setPlaying] = useState(false);

  const hidden = useMemo(
    () => (hideNonMatching && matchIds ? new Set(models.filter((m) => !matchIds.has(m.id)).map((m) => m.id)) : new Set<string>()),
    [models, matchIds, hideNonMatching],
  );
  const visible = useMemo(() => models.filter((m) => !hidden.has(m.id)), [models, hidden]);
  const born = (id: string) => cursor === null || dates.get(id)!.getTime() <= cursor;

  // --- rows ------------------------------------------------------------------

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of models) c.set(m.org, (c.get(m.org) ?? 0) + 1);
    return c;
  }, [models]);
  const rows = useMemo(() => buildRows(organizations, counts, { expanded }), [organizations, counts, expanded]);
  const rowKeyOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.kind !== "header") for (const o of r.orgs) map.set(o, rowId(r));
    return map;
  }, [rows]);
  const visibleOrgs = useMemo(() => new Set(visible.map((m) => m.org)), [visible]);
  const shownRows = useMemo(() => rows.filter((r) => r.orgs.some((o) => visibleOrgs.has(o))), [rows, visibleOrgs]);

  const dataRows = shownRows.filter((r) => r.kind !== "header").length;
  const headerRows = shownRows.length - dataRows;
  const rowH = Math.round(Math.min(ROW_MAX, Math.max(ROW_MIN, (height - 8 - headerRows * HEADER_H) / Math.max(1, dataRows))));
  const rowBoxes = useMemo(() => {
    const boxes: { row: TimelineRow; id: string; y: number; h: number }[] = [];
    for (const row of shownRows) {
      const prev = boxes[boxes.length - 1];
      boxes.push({ row, id: rowId(row), y: prev ? prev.y + prev.h : 0, h: row.kind === "header" ? HEADER_H : rowH });
    }
    return boxes;
  }, [shownRows, rowH]);
  const boxById = useMemo(() => new Map(rowBoxes.map((b) => [b.id, b])), [rowBoxes]);
  const lastBox = rowBoxes[rowBoxes.length - 1];
  const contentH = (lastBox ? lastBox.y + lastBox.h : 0) + 8;

  // Nodes that would overlap on a row's line move onto parallel lines just above and below it.
  const slotStep = Math.round(Math.min(13, Math.max(10, rowH * 0.17)));
  const slots = useMemo(() => {
    const byRow = new Map<string, { id: string; x: number }[]>();
    for (const m of visible) {
      const key = rowKeyOf.get(m.org);
      if (!key) continue;
      const list = byRow.get(key) ?? [];
      list.push({ id: m.id, x: base(dates.get(m.id)!) * packK });
      byRow.set(key, list);
    }
    const out = new Map<string, number>();
    for (const list of byRow.values()) for (const [id, s] of assignSlots(list, NODE_GAP)) out.set(id, s);
    return out;
  }, [visible, rowKeyOf, base, dates, packK]);

  // Rows and nodes glide to new positions instead of jumping.
  const targets = useMemo(() => {
    const t = new Map<string, number>();
    for (const b of rowBoxes) {
      t.set(`y:${b.id}`, b.y);
      t.set(`h:${b.id}`, b.h);
    }
    for (const m of visible) {
      const b = boxById.get(rowKeyOf.get(m.org) ?? "");
      if (b) t.set(m.id, b.y + b.h / 2 + slotOffset(slots.get(m.id) ?? 0, slotStep));
    }
    return t;
  }, [rowBoxes, visible, boxById, rowKeyOf, slots, slotStep]);
  const tween = useTweener(targets, !reduceMotion);
  const targetsRef = useRef(targets);
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  const liveRows = rowBoxes.map((b) => ({ ...b, y: tween.get(`y:${b.id}`) ?? b.y, h: tween.get(`h:${b.id}`) ?? b.h }));
  const liveRowById = new Map(liveRows.map((b) => [b.id, b]));

  const byRow = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of visible) {
      const key = rowKeyOf.get(m.org);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(m.id);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => dates.get(a)!.getTime() - dates.get(b)!.getTime());
    return map;
  }, [visible, rowKeyOf, dates]);
  const rowOrder = rowBoxes.filter((b) => b.row.kind !== "header").map((b) => b.id);

  // --- geometry ----------------------------------------------------------------

  const points = new Map<string, EdgePoint>();
  for (const m of models) {
    const y = tween.get(m.id);
    if (y === undefined) continue;
    points.set(m.id, { x: xOf(dates.get(m.id)!), y, org: m.org });
  }
  const bornPoints = new Map([...points].filter(([id]) => born(id)));

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

  // Zoomed out, labels drop a lab-wide first word ("Claude Opus 4.7" -> "Opus 4.7"); the row names the lab.
  const prefixes = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of organizations) {
      const names = models.filter((m) => m.org === o.id).map((m) => m.name);
      const tally = new Map<string, number>();
      for (const n of names) tally.set(n.split(" ")[0], (tally.get(n.split(" ")[0]) ?? 0) + 1);
      for (const [word, c] of tally) if (names.length >= 3 && c / names.length >= 0.6) map.set(o.id, word);
    }
    return map;
  }, [models, organizations]);

  const labelOf = (m: Model) => {
    const prefix = prefixes.get(m.org);
    if (!prefix || !m.name.startsWith(`${prefix} `) || yearPx(dates.get(m.id)!.getUTCFullYear()) >= 260) return m.name;
    const rest = m.name.slice(prefix.length + 1);
    return rest.length >= 4 && /^[A-Za-z]/.test(rest) ? rest : m.name;
  };
  // The second line: the year, or month and year once there's room.
  const subOf = (m: Model) => {
    const d = dates.get(m.id)!;
    return yearPx(d.getUTCFullYear()) >= 700 && m.releaseDate.length >= 7 ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : String(d.getUTCFullYear());
  };

  // Label priority: milestones, then family roots, then the newest.
  const priorityOf = (m: Model) => {
    const rank = priorityIds?.has(m.id) ? 0 : (graph.children.get(m.id)?.length ?? 0) >= 2 ? 1 : 2;
    return rank * 1e13 - dates.get(m.id)!.getTime();
  };

  // Direct labels, placed where there's room.
  const obstacles: (Box & { id: string })[] = [];
  const requests: LabelRequest[] = [];
  for (const m of visible) {
    const p = bornPoints.get(m.id);
    const box = liveRowById.get(rowKeyOf.get(m.org) ?? "");
    if (!p || !box) continue;
    const r = nodeRadius(priorityIds?.has(m.id) ?? false, m.id === selectedId);
    obstacles.push({ id: m.id, x: p.x - r - 1, y: p.y - r - 1, w: r * 2 + 2, h: r * 2 + 2 });
    if (p.x < left - 4 || p.x > width + 4) continue;
    const strong = m.id === selectedId || m.id === hovered || m.id === featuredId;
    const slot = slots.get(m.id) ?? 0;
    requests.push({
      id: m.id,
      x: p.x,
      y: p.y,
      r,
      width: Math.max(measureLabel(labelOf(m), 12.5, strong ? 700 : 600), measureLabel(subOf(m), 11, 500)) + 2,
      height: LABEL_H,
      priority: priorityOf(m),
      bandTop: box.y - 4,
      bandBottom: box.y + box.h + 4,
      force: strong,
      prefer: slot === 1 ? [1, 4, 2, 0, 3] : slot === 2 ? [0, 3, 2, 1, 4] : [0, 1, 2, 3, 4],
    });
  }
  const placed = placeLabels(requests, obstacles, { minX: left - 8, maxX: width - 4, candidates: sideCandidates });

  // --- time: growth on first load, and Play ------------------------------------

  // The clock runs at a steady pace across the chart, so busy years take longer to pass.
  const runClock = useCallback(
    (duration: number, from: number) => {
      cancelAnimationFrame(clockRef.current);
      const px = (t: number) => baseRef.current(new Date(t));
      const end = today.getTime();
      const f0 = (px(Math.max(startT, Math.min(end, from))) - px(startT)) / (px(end) - px(startT));
      const t0 = performance.now() - f0 * duration;
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        if (p >= 1) {
          setCursor(null);
          setPlaying(false);
          return;
        }
        const b = baseRef.current;
        setCursor(b.invert(px(startT) + (px(end) - px(startT)) * p).getTime());
        clockRef.current = requestAnimationFrame(step);
      };
      clockRef.current = requestAnimationFrame(step);
    },
    [startT, today],
  );

  useEffect(() => {
    growingRef.current = cursor !== null && !playing;
  }, [cursor, playing]);

  useEffect(() => {
    if (!width || grownThisLoad) return;
    grownThisLoad = true;
    if (cursor !== null) runClock(GROW_MS, startT);
  }, [width, cursor, runClock, startT]);

  useEffect(() => () => cancelAnimationFrame(clockRef.current), []);

  // --- zoom & pan -----------------------------------------------------------

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !width) return;
    const sel = select(el);
    const z = d3zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .clickDistance(4)
      // Plain wheel scrolls the rows vertically; ctrl/cmd + wheel (and trackpad pinch) zooms.
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
      .on("zoom", (event: { transform: ZoomTransform }) => setTransform(event.transform))
      .on("end", (event: { transform: ZoomTransform }) => {
        if (!animatingRef.current) setSettledK(event.transform.k);
      });
    sel.call(z);
    el.style.touchAction = "pan-y";
    const first = zoomRef.current === null;
    zoomRef.current = z;
    if (first && width < 640) {
      // Phones open on the most recent years; the whole history is a tap away on the bar below.
      const k = 3;
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
      const c1 = baseRef.current(center);
      const k1 = Math.min(MAX_ZOOM, Math.max(1, targetK));
      const duration = reduceMotion || opts.instant ? 0 : 640;
      const t0 = performance.now();
      animatingRef.current = true;
      const step = (now: number) => {
        const p = duration ? Math.min(1, (now - t0) / duration) : 1;
        const e = easeInOut(p);
        const k = Math.exp(Math.log(start.k) + (Math.log(k1) - Math.log(start.k)) * e);
        const c = c0 + (c1 - c0) * e;
        z.transform(select(el), zoomIdentity.translate(mid - c * k, 0).scale(k));
        if (p < 1) {
          animRef.current = requestAnimationFrame(step);
          return;
        }
        animatingRef.current = false;
        setSettledK(zoomTransform(el).k);
        if (opts.reveal) {
          const reveal = opts.reveal;
          // Wait a frame for the new slots, then bring the model's row into view.
          animRef.current = requestAnimationFrame(() => {
            const y = targetsRef.current.get(reveal);
            if (y !== undefined && (y < el.scrollTop + 30 || y > el.scrollTop + el.clientHeight - 30)) {
              el.scrollTo({ top: y - el.clientHeight / 2, behavior: reduceMotion ? "auto" : "smooth" });
            }
          });
        }
      };
      animRef.current = requestAnimationFrame(step);
    },
    [left, right, rightInset, reduceMotion],
  );

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  // A model picked near the right edge would sit under an overlaid panel: slide it into view.
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
    if (!centerRequest || !width || handledCenter.current === centerRequest.nonce) return;
    const date = dates.get(centerRequest.id);
    if (!date) return;
    handledCenter.current = centerRequest.nonce;
    const k = scrollRef.current ? zoomTransform(scrollRef.current).k : 1;
    // On a deep link, let the growth animation finish first.
    const wait = growingRef.current ? GROW_MS : 0;
    const timer = setTimeout(() => animateTo(Math.max(k, 3), date, { reveal: centerRequest.id }), wait);
    return () => clearTimeout(timer);
  }, [centerRequest, width, dates, animateTo]);

  useEffect(() => {
    if (!fitRequest || !width || handledFit.current === fitRequest.nonce) return;
    handledFit.current = fitRequest.nonce;
    const b = baseRef.current;
    const x0 = b(new Date(fitRequest.from === undefined ? startT : Date.UTC(fitRequest.from, 0, 1)));
    const x1 = b(new Date(fitRequest.to === undefined ? endT : Math.min(endT, Date.UTC(fitRequest.to + 1, 0, 1))));
    const k = Math.max(120, right - rightInset - left) / Math.max(1, x1 - x0);
    animateTo(k, b.invert((x0 + x1) / 2));
  }, [fitRequest, width, left, right, rightInset, startT, endT, animateTo]);

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
    runClock(PLAY_MS, cursor ?? startT);
  };

  // Switching the year spacing morphs every node to its new place and keeps the same date in the middle.
  const switchMode = (next: ScaleMode) => {
    if (next === mode) return;
    const el = scrollRef.current;
    const t = el ? zoomTransform(el) : zoomIdentity;
    const old = baseRef.current;
    pendingCenter.current = old.invert(t.invertX(viewMid));
    cancelAnimationFrame(morphRef.current);
    setMorph(reduceMotion ? null : { from: (d: Date) => t.applyX(old(d)), p: 0 });
    setMode(next);
  };

  useEffect(() => {
    const center = pendingCenter.current;
    const el = scrollRef.current;
    const z = zoomRef.current;
    if (!center || !el || !z) return;
    pendingCenter.current = null;
    const k = zoomTransform(el).k;
    z.transform(select(el), zoomIdentity.translate(viewMid - k * base(center), 0).scale(k));
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / MORPH_MS);
      setMorph((m) => (m && p < 1 ? { ...m, p } : null));
      if (p < 1) morphRef.current = requestAnimationFrame(step);
    };
    morphRef.current = requestAnimationFrame(step);
    // Runs when the new scale is ready after a switch; viewMid is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => () => cancelAnimationFrame(morphRef.current), []);

  // Expanding the shared row brings its labs into view.
  const expandedY = expanded ? rowBoxes.find((b) => b.row.kind === "header")?.y : undefined;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || expandedY === undefined) return;
    el.scrollTo({ top: Math.max(0, expandedY - 8), behavior: reduceMotion ? "auto" : "smooth" });
    // Only when the group opens, not when rows resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const onScroll = () => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => setScrollTop(scrollRef.current?.scrollTop ?? 0));
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
    const rowKey = rowKeyOf.get(m.org) ?? "";
    const row = byRow.get(rowKey) ?? [];
    const idx = row.indexOf(current);
    let next: string | undefined;
    switch (e.key) {
      case "ArrowRight":
        next = row[idx + 1];
        break;
      case "ArrowLeft":
        next = row[idx - 1];
        break;
      case "Home":
        next = row[0];
        break;
      case "End":
        next = row[row.length - 1];
        break;
      case "ArrowUp":
      case "ArrowDown": {
        const target = byRow.get(rowOrder[rowOrder.indexOf(rowKey) + (e.key === "ArrowUp" ? -1 : 1)]);
        if (target?.length) {
          const t = dates.get(current)!.getTime();
          next = target.reduce((best, id) => (Math.abs(dates.get(id)!.getTime() - t) < Math.abs(dates.get(best)!.getTime() - t) ? id : best));
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

  // --- overview data (rebuilt when the data or filters change, not on camera moves) ---

  const histItems = useMemo(
    () =>
      visible.map((m) => ({
        id: m.id,
        t: dates.get(m.id)!.getTime(),
        color: colors.get(m.org) ?? "#8b9ab3",
        dim: matchIds ? !matchIds.has(m.id) : false,
        born: cursor === null || dates.get(m.id)!.getTime() <= cursor,
      })),
    [visible, dates, colors, matchIds, cursor],
  );

  const minimapDots = useMemo(() => {
    const span = right - left;
    const height = rowBoxes.length ? rowBoxes[rowBoxes.length - 1].y + rowBoxes[rowBoxes.length - 1].h + 8 : 1;
    return visible
      .filter((m) => cursor === null || dates.get(m.id)!.getTime() <= cursor)
      .map((m) => {
        const b = boxById.get(rowKeyOf.get(m.org) ?? "");
        return {
          id: m.id,
          x: (base(dates.get(m.id)!) - left) / span,
          y: b ? (b.y + b.h / 2) / height : 0,
          color: colors.get(m.org) ?? "#8b9ab3",
          dim: matchIds ? !matchIds.has(m.id) : false,
        };
      });
  }, [visible, cursor, dates, boxById, rowKeyOf, rowBoxes, base, left, right, colors, matchIds]);

  // --- render ---------------------------------------------------------------

  const todayX = xOf(today);
  const cursorX = cursor === null || !Number.isFinite(cursor) ? null : xOf(new Date(cursor));
  const hoveredPoint = hovered ? bornPoints.get(hovered) : undefined;
  const selectedPoint = selectedId && !hidden.has(selectedId) ? bornPoints.get(selectedId) : undefined;
  const hoveredModel = hovered ? modelById.get(hovered) : undefined;
  const annotated = annotations
    .filter((a) => modelById.has(a.model))
    .map((a) => ({ ...a, date: modelById.get(a.model)!.releaseDate, t: dates.get(a.model)!.getTime() }));
  const span = right - left;
  const tooltipAbove = hoveredPoint ? hoveredPoint.y + 170 > scrollTop + height : false;

  const minimap: MinimapData | undefined =
    width > 0 && !compact
      ? {
          dots: minimapDots,
          view: {
            x0: (transform.invertX(left) - left) / span,
            x1: (transform.invertX(right) - left) / span,
            y0: scrollTop / contentH,
            y1: (scrollTop + height) / contentH,
          },
          onMove: (nx, ny) => {
            animateTo(transform.k, base.invert(left + nx * span), { instant: true });
            if (scrollRef.current) scrollRef.current.scrollTop = ny * contentH - height / 2;
          },
        }
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0" style={{ height: AXIS_H }}>
        {width > 0 && <Axis x={xOf} years={years} left={left} width={width} gutter={gutter} today={today} cursor={cursor} flags={annotated} onSelect={(id) => onSelect(id)} />}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="absolute inset-0 cursor-grab overflow-y-auto overflow-x-hidden [overflow-anchor:none] active:cursor-grabbing"
          role="group"
          aria-label="AI model timeline. Use the arrow keys to move between models and Enter to open one."
          onKeyDown={onKeyDown}
          onScroll={onScroll}
        >
          {width > 0 && (
            <div className="relative" style={{ height: contentH }}>
              <svg width={width} height={contentH} className="absolute left-0 top-0 block" style={{ maskImage: fade, WebkitMaskImage: fade }}>
                <defs>
                  {organizations.map((o) => (
                    <radialGradient key={o.id} id={`halo-${o.id}`}>
                      <stop offset="0" stopColor={o.color} stopOpacity={0.62} />
                      <stop offset="0.42" stopColor={o.color} stopOpacity={0.2} />
                      <stop offset="1" stopColor={o.color} stopOpacity={0} />
                    </radialGradient>
                  ))}
                </defs>
                <rect width={width} height={contentH} fill="transparent" onClick={() => onSelect(undefined)} />

                <g pointerEvents="none" aria-hidden="true">
                  {years.map((y) => {
                    const gx = xOf(new Date(Date.UTC(y, 0, 1)));
                    return gx > left - 4 && gx < width ? <line key={y} x1={gx} x2={gx} y2={contentH} stroke="rgb(150 165 220 / 0.09)" strokeDasharray="2 5" /> : null;
                  })}
                  {liveRows.slice(1).map((b) => (
                    <line key={b.id} x1={0} x2={width} y1={b.y} y2={b.y} stroke="rgb(150 165 220 / 0.06)" />
                  ))}
                  {annotated
                    .filter((a) => cursor === null || a.t <= cursor)
                    .map((a) => {
                      const ax = xOf(new Date(a.t));
                      return ax > left ? <line key={a.model} x1={ax} x2={ax} y2={contentH} stroke="rgb(185 170 255 / 0.22)" strokeDasharray="1 5" strokeLinecap="round" /> : null;
                    })}
                  {todayX > left && todayX < width && <line x1={todayX} x2={todayX} y2={contentH} stroke="var(--today)" strokeOpacity={0.45} strokeDasharray="3 4" />}
                  {cursorX !== null && cursorX > left && <line x1={cursorX} x2={cursorX} y2={contentH} stroke="var(--today)" strokeWidth={1.5} />}
                </g>

                {/* Each row's line, emerging from the left and running to its latest release. */}
                <g pointerEvents="none" aria-hidden="true" className="tl-fade" opacity={lineageSet ? 0.3 : 1}>
                  {liveRows.map((b) => {
                    if (b.row.kind === "header") return null;
                    const xs = (byRow.get(b.id) ?? []).filter((id) => bornPoints.has(id)).map((id) => bornPoints.get(id)!.x);
                    if (!xs.length) return null;
                    const x1 = Math.min(...xs) - 44;
                    const x2 = Math.max(...xs);
                    const y = b.y + b.h / 2;
                    const color = b.row.kind === "group" ? "#8e9bd8" : (colors.get(b.row.orgs[0]) ?? "#8e9bd8");
                    const gid = svgId(`rail-${b.id}`);
                    return (
                      <g key={b.id}>
                        <defs>
                          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1={0} y2={0}>
                            <stop offset="0" stopColor={color} stopOpacity={0} />
                            <stop offset={Math.min(0.5, 60 / Math.max(1, x2 - x1))} stopColor={color} stopOpacity={1} />
                            <stop offset="1" stopColor={color} stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <line x1={x1} x2={x2} y1={y} y2={y} stroke={`url(#${gid})`} strokeOpacity={0.12} strokeWidth={9} strokeLinecap="round" />
                        <line x1={x1} x2={x2} y1={y} y2={y} stroke={`url(#${gid})`} strokeOpacity={0.45} strokeWidth={1.4} strokeLinecap="round" />
                      </g>
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
                      <Node
                        key={m.id}
                        id={m.id}
                        ariaLabel={`${m.name}, ${org?.name ?? m.org}, released ${formatDate(m.releaseDate)}`}
                        x={p.x}
                        y={p.y}
                        color={colors.get(m.org) ?? "#8b9ab3"}
                        haloId={`halo-${m.org}`}
                        open={m.openness !== "closed"}
                        milestone={priorityIds?.has(m.id) ?? false}
                        selected={m.id === selectedId}
                        featured={m.id === featuredId && !selectedId}
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
                    const m = modelById.get(l.id)!;
                    const strong = l.id === selectedId || l.id === hovered || l.id === featuredId;
                    const state = nodeState(l.id);
                    // Labels to the left of their dot are right-aligned, so both lines hug the dot.
                    const end = l.candidate >= 3;
                    const tx = end ? l.x + l.w : l.x;
                    return (
                      <text key={l.id} textAnchor={end ? "end" : "start"} className={`tl-label tl-fade ${state === "dim" ? "tl-dim" : ""}`}>
                        <tspan x={tx} y={l.y + 12} fontSize={12.5} fontWeight={strong ? 700 : 600} fill={strong ? "#ffffff" : "#e2e7f3"}>
                          {labelOf(m)}
                        </tspan>
                        <tspan x={tx} y={l.y + 26.5} fontSize={11} fontWeight={500} fill="#8792ad" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {subOf(m)}
                        </tspan>
                      </text>
                    );
                  })}
                </g>
              </svg>

              {/* Continuous animations get their own layer, so they don't repaint the chart beneath. */}
              <svg
                width={width}
                height={contentH}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 block"
                style={{ maskImage: fade, WebkitMaskImage: fade, willChange: "transform" }}
              >
                <FlowLines edges={graph.edges} points={bornPoints} stateOf={edgeState} />
                {selectedPoint && (
                  <circle
                    key={selectedId}
                    className="tl-breathe"
                    cx={selectedPoint.x}
                    cy={selectedPoint.y}
                    r={nodeRadius(false, true) + 6}
                    fill="none"
                    stroke={colors.get(selectedPoint.org) ?? "#8b9ab3"}
                    strokeWidth={1.5}
                  />
                )}
              </svg>

              {/* The lab column. The chart fades out beneath it. */}
              <div className="absolute left-0 top-0" style={{ width: gutter, height: contentH }}>
                {liveRows.map((b) => (
                  <RowCard
                    key={b.id}
                    row={b.row}
                    y={b.y}
                    h={b.h}
                    width={gutter}
                    compact={compact}
                    orgById={orgById}
                    matched={matchIds ? (byRow.get(b.id) ?? []).filter((id) => matchIds.has(id)).length : null}
                    pressed={b.row.kind === "org" && focusedOrgs.includes(b.row.key)}
                    onFocusOrg={onFocusOrg}
                    onToggleGroup={() => setExpanded((e) => !e)}
                  />
                ))}
              </div>

              <AnimatePresence>
                {hoveredModel && hoveredPoint && (
                  <motion.div
                    key={hoveredModel.id}
                    initial={{ opacity: 0, y: tooltipAbove ? -4 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    transition={{ duration: 0.16, ease: ease.out }}
                    className="pointer-events-none absolute z-20 w-72 rounded-xl border border-rule-2 bg-[rgb(10_14_28/0.96)] p-3.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)]"
                    style={{
                      left: Math.min(Math.max(hoveredPoint.x - 16, gutter + 8), width - 300),
                      top: tooltipAbove ? undefined : hoveredPoint.y + 20,
                      bottom: tooltipAbove ? contentH - hoveredPoint.y + 20 : undefined,
                      boxShadow: `0 18px 40px -12px rgb(0 0 0 / 0.8), 0 0 0 1px ${colors.get(hoveredModel.org)}22, 0 0 30px -12px ${colors.get(hoveredModel.org)}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                      <span className="size-2 rounded-full" style={{ background: colors.get(hoveredModel.org), boxShadow: `0 0 8px ${colors.get(hoveredModel.org)}` }} />
                      {orgById.get(hoveredModel.org)?.name} · {formatDate(hoveredModel.releaseDate)}
                    </div>
                    <div className="mt-1 text-[16px] font-semibold leading-snug text-white">{hoveredModel.name}</div>
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
          )}
        </div>
      </div>

      {width > 0 && (
        <BottomBar
          domain={extent}
          view={[dateAt(left), dateAt(right)]}
          items={histItems}
          playing={playing}
          cursor={cursor}
          onPlayToggle={togglePlay}
          onCenter={(date) => animateTo(transform.k, date, { instant: true })}
          onZoom={zoomBy}
          onReset={resetZoom}
          mode={mode}
          onModeChange={switchMode}
          minimap={minimap}
        />
      )}
    </div>
  );
}

interface RowCardProps {
  row: TimelineRow;
  y: number;
  h: number;
  width: number;
  compact: boolean;
  orgById: Map<string, Organization>;
  /** Models in the row matching the filters, or null when nothing is filtered. */
  matched: number | null;
  pressed: boolean;
  onFocusOrg?: (orgId: string) => void;
  onToggleGroup: () => void;
}

/** A row's card in the lab column: the lab's badge, name and model count. */
function RowCard({ row, y, h, width, compact, orgById, matched, pressed, onFocusOrg, onToggleGroup }: RowCardProps) {
  const inset = compact ? 6 : row.nested ? 22 : 12;
  // In the narrower column the chevron gives its room to the name.
  const narrow = width < GUTTER;
  const cardW = width - inset - (compact ? 6 : 12);
  const count = matched === null ? `${row.count} ${row.count === 1 ? "model" : "models"}` : `${matched} of ${row.count}`;

  if (row.kind === "header") {
    const top = y + (h - 28) / 2;
    return (
      <button
        type="button"
        onClick={onToggleGroup}
        aria-expanded="true"
        className="absolute flex items-center gap-2 rounded-lg px-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 transition-colors hover:text-ink"
        style={{ top, left: inset, height: 28, width: cardW }}
      >
        <ChevronIcon width={13} height={13} className="rotate-180" />
        {compact ? "" : `Other labs · ${row.orgs.length}`}
        <span className="sr-only">Collapse the other labs into one row</span>
      </button>
    );
  }

  const cardH = Math.min(row.nested ? 50 : 58, h - 12);
  const top = y + (h - cardH) / 2;
  const org = row.kind === "org" ? orgById.get(row.key) : undefined;
  const group = row.kind === "group";
  const name = org ? (org.name.length > 14 ? (org.shortName ?? org.name) : org.name) : `${row.name} · ${row.orgs.length}`;
  const label = group ? `Other labs: ${row.orgs.length} labs, ${count}. Show each lab on its own row.` : `${org?.name}: ${count}. ${pressed ? "Show all labs." : "Show only this lab."}`;

  return (
    <button
      type="button"
      onClick={() => (group ? onToggleGroup() : onFocusOrg?.(row.key))}
      aria-label={label}
      aria-pressed={group ? undefined : pressed}
      aria-expanded={group ? false : undefined}
      title={label}
      className={`group/card absolute flex items-center gap-2.5 rounded-xl border text-left transition-[background-color,border-color,box-shadow] ${compact ? "justify-center" : "px-2.5"} ${
        pressed ? "border-[rgb(157_140_255/0.55)] bg-[rgb(40_36_90/0.55)] shadow-[0_0_24px_-8px_rgb(143_125_255/0.8)]" : "border-rule bg-[rgb(11_16_31/0.84)] hover:border-rule-2 hover:bg-[rgb(18_24_45/0.9)]"
      }`}
      style={{ top, left: inset, height: cardH, width: cardW }}
    >
      {group ? (
        <GroupBadge colors={row.orgs.map((id) => orgById.get(id)?.color ?? "#8b9ab3")} size={compact ? 32 : 34} />
      ) : org ? (
        <OrgBadge org={org} size={compact ? 32 : row.nested ? 28 : 34} />
      ) : null}
      {!compact && (
        <>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-semibold text-ink ${row.nested ? "text-[12.5px]" : "text-[13.5px]"}`}>{name}</span>
            <span className="block truncate text-[11.5px] tabular-nums text-ink-3">{count}</span>
          </span>
          {(group || !narrow) && <ChevronIcon width={14} height={14} className={`shrink-0 text-ink-3 transition-transform group-hover/card:text-ink-2 ${group ? "" : "-rotate-90"}`} />}
        </>
      )}
    </button>
  );
}
