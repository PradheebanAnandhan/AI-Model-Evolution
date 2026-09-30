"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useTransform, type MotionValue } from "motion/react";
import type { Chapter } from "@/content/story";
import type { RibbonData } from "@/lib/ribbon";
import { ease } from "@/lib/motion";

interface EvolutionRibbonProps {
  data: RibbonData;
  chapters: Chapter[];
  /** Fractional chapter index driven by scroll. */
  progress: MotionValue<number>;
  active: number;
}

const monthStart = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, m - 1, 1);
};
const monthEnd = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, m, 0, 23, 59);
};

/** The story's sticky chart: every model as a dot, with a highlighter band over the current era. */
export function EvolutionRibbon({ data, chapters, progress, active }: EvolutionRibbonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const laneLabels = w >= 520;
  const m = { top: 70, bottom: 30, left: laneLabels ? 86 : 12, right: 16 };
  const plotW = Math.max(1, w - m.left - m.right);
  const plotH = Math.max(1, h - m.top - m.bottom);
  const t0 = Date.UTC(data.stats.first, 0, 1);
  const t1 = Date.UTC(data.stats.last, 11, 31);
  const norm = (t: number) => (t - t0) / (t1 - t0);

  // Dot positions: one lane per lab, with close neighbours nudged apart vertically.
  const laneH = plotH / data.orgs.length;
  const positions = useMemo(() => {
    const at = (t: number) => ((t - t0) / (t1 - t0)) * plotW;
    const pos = new Map<string, { x: number; y: number; lane: number }>();
    data.orgs.forEach((o, lane) => {
      const inLane = data.models.filter((mm) => mm.org === o.id).sort((a, b) => a.t - b.t);
      let lastX = -Infinity;
      let flip = 0;
      for (const mm of inLane) {
        const x = at(mm.t);
        flip = x - lastX < 7 ? (flip + 1) % 3 : 0;
        lastX = x;
        const offset = [0, -0.25, 0.25][flip] * laneH;
        pos.set(mm.id, { x, y: lane * laneH + laneH / 2 + offset, lane });
      }
    });
    return pos;
  }, [data, plotW, laneH, t0, t1]);

  const windows = useMemo(() => {
    const n = (t: number) => (t - t0) / (t1 - t0);
    return chapters.map((c) => ({ a: n(monthStart(c.from)), b: n(monthEnd(c.to)) }));
  }, [chapters, t0, t1]);

  // The highlighter band glides between chapter windows as the story scrolls.
  const interp = (f: number) => {
    const i = Math.max(0, Math.min(windows.length - 1, Math.floor(f)));
    const j = Math.min(windows.length - 1, i + 1);
    const frac = Math.max(0, Math.min(1, f - i));
    const a = windows[i].a + (windows[j].a - windows[i].a) * frac;
    const b = windows[i].b + (windows[j].b - windows[i].b) * frac;
    return { a, b };
  };
  const bandX = useTransform(progress, (f) => `${interp(f).a * 100}%`);
  const bandW = useTransform(progress, (f) => {
    const { a, b } = interp(f);
    return `${Math.max(0.5, (b - a) * 100)}%`;
  });

  const chapter = chapters[active];
  const key = new Set(chapter.models);
  const era = { a: monthStart(chapter.from), b: monthEnd(chapter.to) };
  const inEra = (t: number) => t >= era.a && t <= era.b;
  const activeEdges = data.edges.filter((e) => (key.has(e.to) || key.has(e.from)) && positions.has(e.from) && positions.has(e.to));
  const colorOf = new Map(data.models.map((mm) => [mm.id, mm.color]));

  // Place each key model's label in the first free spot around its dot; drop it if none is free.
  const labels = useMemo(() => {
    const H = 16;
    const boxes: { x: number; y: number; w: number }[] = [];
    const placed: { id: string; name: string; x: number; y: number; w: number; dot: { x: number; y: number } }[] = [];
    const ms = data.models.filter((mm) => chapter.models.includes(mm.id) && positions.has(mm.id));
    ms.sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x);
    for (const mm of ms) {
      const p = positions.get(mm.id)!;
      const w = mm.name.length * 6.6 + 4;
      const right = p.x + 9;
      const left = p.x - 9 - w;
      const candidates = [
        { x: right, y: p.y - H / 2 },
        { x: left, y: p.y - H / 2 },
        { x: right, y: p.y - H - 6 },
        { x: left, y: p.y - H - 6 },
        { x: right, y: p.y + 6 },
        { x: left, y: p.y + 6 },
      ];
      const fits = (c: { x: number; y: number }) => c.x >= -m.left + 6 && c.x + w <= plotW + m.right - 4 && c.y >= -12 && c.y + H <= plotH + 8;
      const free = (c: { x: number; y: number }) =>
        !boxes.some((b) => c.x < b.x + b.w + 6 && c.x + w + 6 > b.x && c.y < b.y + H + 2 && c.y + H + 2 > b.y);
      const spot = candidates.find((c) => fits(c) && free(c));
      if (!spot) continue;
      boxes.push({ ...spot, w });
      placed.push({ id: mm.id, name: mm.name, ...spot, w, dot: p });
    }
    return placed;
  }, [data, chapter, positions, plotW, plotH, m.left, m.right]);

  const y0 = data.stats.first;
  const yearTicks = Array.from({ length: data.stats.last - y0 + 1 }, (_, i) => y0 + i);
  const fromYear = chapter.from.slice(0, 4);
  const toYear = chapter.to.slice(0, 4);

  return (
    <div ref={ref} className="card relative h-full w-full overflow-hidden">
      {w > 0 && (
        <svg width={w} height={h} className="block" role="img" aria-label={`Every model in the atlas; highlighted: ${chapter.title}, ${fromYear}${toYear !== fromYear ? `–${toYear}` : ""}.`}>
          <text x={18} y={24} fontSize={12} fill="#7c86a1">
            Chapter {active + 1} of {chapters.length}
          </text>
          <AnimatePresence mode="wait" initial={false}>
            <motion.text
              key={chapter.id}
              x={18}
              y={54}
              fontSize={30}
              fontWeight={600}
              fill="#ffffff"
              style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3, ease: ease.out }}
            >
              {fromYear}
              {toYear !== fromYear ? `–${toYear}` : ""}
            </motion.text>
          </AnimatePresence>

          <g transform={`translate(${m.left},${m.top})`}>
            {/* Highlighter band over the current era, scrubbed by scroll */}
            <svg x={0} y={0} width={plotW} height={plotH} overflow="visible">
              <motion.rect x={bandX} width={bandW} y={-10} height={plotH + 20} rx={6} fill="#9d8cff" fillOpacity={0.13} stroke="#9d8cff" strokeOpacity={0.35} />
            </svg>

            {data.orgs.map((o, i) => (
              <g key={o.id}>
                <line x1={0} x2={plotW} y1={(i + 1) * laneH} y2={(i + 1) * laneH} stroke="rgb(150 165 220 / 0.08)" />
                {laneLabels && (
                  <text
                    x={-10}
                    y={i * laneH + laneH / 2}
                    dy="0.35em"
                    textAnchor="end"
                    fontSize={11}
                    fontWeight={data.models.some((mm) => mm.org === o.id && key.has(mm.id)) ? 600 : 400}
                    fill={data.models.some((mm) => mm.org === o.id && key.has(mm.id)) ? "#ffffff" : "#7c86a1"}
                  >
                    {o.shortName ?? o.name}
                  </text>
                )}
              </g>
            ))}

            {yearTicks.map((y) => {
              const x = norm(Date.UTC(y, 0, 1)) * plotW;
              return (
                <g key={y}>
                  <line x1={x} x2={x} y1={0} y2={plotH} stroke="rgb(150 165 220 / 0.08)" />
                  <text x={x + 3} y={plotH + 18} fontSize={11} fill="#7c86a1" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {w < 520 ? `’${String(y).slice(2)}` : y}
                  </text>
                </g>
              );
            })}

            {data.edges.map((e) => {
              const a = positions.get(e.from);
              const b = positions.get(e.to);
              if (!a || !b) return null;
              const dx = Math.max(10, (b.x - a.x) / 2);
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`}
                  fill="none"
                  stroke="rgb(150 165 220 / 0.16)"
                  strokeWidth={0.9}
                />
              );
            })}

            <g key={chapter.id}>
              {activeEdges.map((e, i) => {
                const a = positions.get(e.from)!;
                const b = positions.get(e.to)!;
                const dx = Math.max(10, (b.x - a.x) / 2);
                return (
                  <motion.path
                    key={`${e.from}-${e.to}`}
                    d={`M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`}
                    fill="none"
                    stroke={colorOf.get(e.to)}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: ease.out, delay: 0.1 + i * 0.04 }}
                  />
                );
              })}
            </g>

            {data.models.map((mm) => {
              const p = positions.get(mm.id);
              if (!p) return null;
              const isKey = key.has(mm.id);
              const within = inEra(mm.t);
              return (
                <circle
                  key={mm.id}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={isKey || within ? mm.color : "#2b3252"}
                  stroke={isKey ? "#05070d" : "none"}
                  strokeWidth={1.2}
                  style={
                    {
                      transform: `scale(${isKey ? 1.75 : within ? 1.15 : 0.9})`,
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      transition: "transform 450ms var(--ease-out), fill 450ms",
                      filter: isKey ? `drop-shadow(0 0 4px ${mm.color})` : undefined,
                    } as CSSProperties
                  }
                />
              );
            })}

            <AnimatePresence>
              {labels.map((l, i) => {
                const midY = l.y + 8;
                const attachX = l.x > l.dot.x ? l.x - 2 : l.x + l.w + 2;
                return (
                  <motion.g
                    key={`${chapter.id}-${l.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                  >
                    {Math.abs(midY - l.dot.y) > 2 && <line x1={l.dot.x} y1={l.dot.y} x2={attachX} y2={midY} stroke="#5d6784" strokeWidth={0.8} />}
                    <text
                      x={l.x}
                      y={midY}
                      dy="0.35em"
                      fontSize={12}
                      fontWeight={600}
                      fill="#f1f4fb"
                      style={{ paintOrder: "stroke", stroke: "#070a14", strokeWidth: 4, strokeLinejoin: "round" }}
                    >
                      {l.name}
                    </text>
                  </motion.g>
                );
              })}
            </AnimatePresence>
          </g>
        </svg>
      )}
    </div>
  );
}
