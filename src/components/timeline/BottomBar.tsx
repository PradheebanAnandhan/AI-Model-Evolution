"use client";

import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { scaleUtc } from "d3-scale";
import { monthBins } from "@/lib/histogram";
import type { ScaleMode } from "@/lib/timescale";
import { ExpandIcon, MinusIcon, PauseIcon, PlayIcon, PlusIcon } from "../icons";
import { Legend } from "./Legend";

export interface HistogramItem {
  id: string;
  t: number;
  color: string;
  dim: boolean;
  born: boolean;
}

export interface MinimapData {
  dots: { id: string; x: number; y: number; color: string; dim: boolean }[];
  /** The visible part of the chart, as fractions of its full width and height. */
  view: { x0: number; x1: number; y0: number; y1: number };
  onMove: (nx: number, ny: number) => void;
}

interface BottomBarProps {
  /** The full calendar extent. */
  domain: [Date, Date];
  /** The dates currently in view on the chart. */
  view: [Date, Date];
  items: HistogramItem[];
  playing: boolean;
  cursor: number | null;
  onPlayToggle: () => void;
  onCenter: (date: Date) => void;
  onZoom: (factor: number) => void;
  onReset: () => void;
  mode: ScaleMode;
  onModeChange: (mode: ScaleMode) => void;
  minimap?: MinimapData;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const HIST_H = 40;
const BASE_Y = 27;
const DOT_STEP = 4;

/** Play, releases per month (drag it to move the view), the minimap, and zoom. */
export function BottomBar({ domain, view, items, playing, cursor, onPlayToggle, onCenter, onZoom, onReset, mode, onModeChange, minimap }: BottomBarProps) {
  const [histRef, histW] = useWidth<HTMLDivElement>();
  const dragging = useRef(false);
  const s = useMemo(() => scaleUtc().domain(domain).range([4, Math.max(40, histW - 4)]), [domain, histW]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const bins = useMemo(() => monthBins(items, domain[0].getTime(), domain[1].getTime() - 1), [items, domain]);
  const clock = cursor !== null && Number.isFinite(cursor) ? cursor : null;
  const year = clock === null ? null : new Date(clock).getUTCFullYear();

  const [r0, r1] = s.range();
  const vx0 = Math.max(r0, s(view[0]));
  const vx1 = Math.min(r1, s(view[1]));
  const years: number[] = [];
  for (let y = domain[0].getUTCFullYear(); y < domain[1].getUTCFullYear(); y++) years.push(y);
  // Label every year that has room for its number (about 32px).
  const yearStep = Math.max(1, Math.ceil(32 / Math.max(1, histW / years.length)));

  const centerAt = (clientX: number, el: Element) => {
    const px = clientX - el.getBoundingClientRect().left;
    onCenter(s.invert(Math.min(r1, Math.max(r0, px))));
  };

  const btn = "grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-white/[0.07] hover:text-white";

  return (
    <div className="flex items-stretch gap-3 pt-2.5">
      <button
        type="button"
        onClick={onPlayToggle}
        className="group relative grid w-12 shrink-0 place-items-center self-center rounded-full border border-[rgb(157_140_255/0.45)] bg-[radial-gradient(circle_at_30%_25%,rgb(157_140_255/0.45),rgb(20_22_48/0.9))] text-white shadow-[0_0_24px_-4px_rgb(143_125_255/0.8)] transition-transform hover:scale-105 active:scale-95"
        style={{ height: 48 }}
        aria-label={playing ? "Pause the replay" : "Replay history from 2017"}
      >
        {playing ? <PauseIcon width={17} height={17} /> : <PlayIcon width={17} height={17} className="translate-x-px" />}
      </button>

      <div className="glass min-w-0 flex-1 rounded-2xl px-4 pb-1 pt-1.5">
        <div className="flex items-baseline justify-between gap-3 text-[12px]">
          <span className="whitespace-nowrap font-medium text-ink-2">
            <span className="sm:hidden">Releases</span>
            <span className="hidden sm:inline">Model releases over time</span>
            {year !== null && <span className="ml-2 tabular-nums text-today">{year}</span>}
          </span>
          <Legend className="hidden justify-end 2xl:flex" />
        </div>
        <div ref={histRef} className="relative mt-1">
          {histW > 0 && (
            <svg
              width={histW}
              height={HIST_H}
              className="block cursor-ew-resize touch-none select-none"
              role="img"
              aria-label="Releases per month across the whole timeline. Click or drag to move the chart."
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                centerAt(e.clientX, e.currentTarget);
              }}
              onPointerMove={(e) => dragging.current && centerAt(e.clientX, e.currentTarget)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
            >
              <line x1={r0} x2={r1} y1={BASE_Y + 3} y2={BASE_Y + 3} stroke="rgb(160 175 230 / 0.18)" />
              <rect x={vx0} y={0.5} width={Math.max(4, vx1 - vx0)} height={BASE_Y + 6} rx={6} fill="rgb(157 140 255 / 0.08)" stroke="rgb(157 140 255 / 0.6)" />
              <HistogramDots bins={bins} byId={byId} s={s} />
              {years.map((y, i) =>
                i % yearStep ? null : (
                  <text key={y} x={s(new Date(Date.UTC(y, 0, 1))) + 2} y={HIST_H - 1} fontSize={10.5} fill="#77819c" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {y}
                  </text>
                ),
              )}
              {clock !== null && <line x1={s(new Date(clock))} x2={s(new Date(clock))} y1={0} y2={BASE_Y + 6} stroke="var(--today)" strokeWidth={1.5} />}
            </svg>
          )}
        </div>
      </div>

      {minimap && <Minimap {...minimap} />}

      {/* On phones, pinch to zoom; the buttons give their room to the chart above. */}
      <div className="glass hidden shrink-0 flex-col justify-center gap-1 rounded-2xl p-1.5 sm:flex">
        <div className="flex items-center">
          <HowToRead />
          <button type="button" className={btn} onClick={() => onZoom(1 / 1.8)} aria-label="Zoom out" title="Zoom out (or Ctrl + scroll)">
            <MinusIcon />
          </button>
          <button type="button" className={btn} onClick={() => onZoom(1.8)} aria-label="Zoom in" title="Zoom in (or Ctrl + scroll; drag to pan)">
            <PlusIcon />
          </button>
          <button type="button" className={btn} onClick={onReset} aria-label="Show the whole timeline" title="Show the whole timeline">
            <ExpandIcon />
          </button>
        </div>
        <div role="radiogroup" aria-label="Year spacing" className="flex rounded-lg bg-white/[0.04] p-0.5 text-[11px] font-medium">
          {(
            [
              ["activity", "Activity", "Busier years get more room"],
              ["calendar", "Calendar", "Every year gets the same room"],
            ] as const
          ).map(([value, label, title]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              title={title}
              onClick={() => onModeChange(value)}
              className={`flex-1 rounded-md px-2 py-1 transition-colors ${mode === value ? "bg-[rgb(157_140_255/0.25)] text-white" : "text-ink-3 hover:text-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One dot per release, stacked by month. Memoized: it only changes with the data, filters or clock. */
const HistogramDots = memo(function HistogramDots({ bins, byId, s }: { bins: ReturnType<typeof monthBins>; byId: Map<string, HistogramItem>; s: (d: Date) => number }) {
  return (
    <g>
      {bins.map((bin) => {
        const cx = s(new Date(bin.start + 15 * 864e5));
        return bin.ids.map((id, i) => {
          const it = byId.get(id)!;
          return <circle key={id} cx={cx} cy={BASE_Y - i * DOT_STEP} r={1.75} fill={it.color} opacity={it.born ? (it.dim ? 0.2 : 0.95) : 0} style={{ transition: "opacity 200ms" }} />;
        });
      })}
    </g>
  );
});

const MinimapDots = memo(function MinimapDots({ dots }: { dots: MinimapData["dots"] }) {
  return (
    <g>
      {dots.map((d) => (
        <circle key={d.id} cx={d.x * MM_W} cy={d.y * MM_H} r={1.4} fill={d.color} opacity={d.dim ? 0.2 : 0.9} />
      ))}
    </g>
  );
});

/** The legend and the controls, in a popover (the legend is also inline on very wide screens). */
function HowToRead() {
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
        aria-label="How to read the chart"
        title="How to read the chart"
        onClick={() => setOpen((o) => !o)}
        className={`grid size-8 place-items-center rounded-lg text-[13px] font-semibold transition-colors hover:bg-white/[0.07] hover:text-white ${open ? "bg-white/[0.08] text-white" : "text-ink-2"}`}
      >
        ?
      </button>
      {open && (
        <div role="dialog" aria-label="How to read the chart" className="absolute bottom-full right-0 z-40 mb-3 w-[300px] rounded-2xl border border-rule-2 bg-card p-4 text-[12.5px] leading-relaxed text-ink-2 shadow-[0_24px_60px_-16px_rgb(0_0_0/0.9)]">
          <p className="mb-2 text-[13px] font-semibold text-white">How to read it</p>
          <Legend className="mb-3 gap-y-1.5" />
          <ul className="list-disc space-y-1 pl-4 marker:text-ink-3">
            <li>Each row is a lab. Lines link a model to the ones it builds on, in the newer model&apos;s color.</li>
            <li>Drag to pan. Zoom with Ctrl or ⌘ + scroll, a pinch, or the buttons.</li>
            <li>Hover a dot to trace its lineage; click it for its sourced record.</li>
            <li>Select a lab&apos;s card to show only its models.</li>
            <li>Activity gives busier years more room; Calendar spaces every year evenly.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

const MM_W = 176;
const MM_H = 60;

function Minimap({ dots, view, onMove }: MinimapData) {
  const dragging = useRef(false);
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const vx = Math.max(0, view.x0) * MM_W;
  const vw = Math.max(6, (Math.min(1, view.x1) - Math.max(0, view.x0)) * MM_W);
  const vy = Math.max(0, view.y0) * MM_H;
  const vh = Math.max(6, (Math.min(1, view.y1) - Math.max(0, view.y0)) * MM_H);
  return (
    <div className="glass hidden shrink-0 rounded-2xl p-2 xl:block">
      <svg
        width={MM_W}
        height={MM_H}
        className="block cursor-move touch-none select-none"
        role="img"
        aria-label="Minimap of the chart. Click or drag to move the view."
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => dragging.current && move(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <MinimapDots dots={dots} />
        <rect x={vx} y={vy} width={vw} height={vh} rx={3} fill="rgb(157 140 255 / 0.07)" stroke="#a99bff" strokeDasharray="3 3" />
      </svg>
    </div>
  );
}
