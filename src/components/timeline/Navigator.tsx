import { useMemo, useRef } from "react";
import { scaleUtc } from "d3-scale";
import { ExpandIcon, MinusIcon, PauseIcon, PlayIcon, PlusIcon } from "../icons";

interface NavigatorProps {
  /** The full date range of the timeline. */
  domain: [Date, Date];
  /** The currently visible date range. */
  view: [Date, Date];
  marks: { id: string; date: Date; color: string; dim: boolean }[];
  width: number;
  playing: boolean;
  cursor: number | null;
  onPlayToggle: () => void;
  onCenter: (date: Date) => void;
  onZoom: (factor: number) => void;
  onReset: () => void;
}

const H = 34;

/** Play history, the overview strip (drag it to move the view), and zoom controls. */
export function Navigator({ domain, view, marks, width, playing, cursor, onPlayToggle, onCenter, onZoom, onReset }: NavigatorProps) {
  const dragging = useRef(false);
  const stripW = Math.max(120, width - 212);
  const base = useMemo(() => scaleUtc().domain(domain).range([1, stripW - 1]), [domain, stripW]);
  const [r0, r1] = base.range();
  const vx0 = Math.max(r0, base(view[0]));
  const vx1 = Math.min(r1, base(view[1]));
  const n = Math.max(2, Math.floor(stripW / 80));
  const years = base.ticks(n);
  const format = base.tickFormat(n);
  const year = cursor === null ? null : new Date(cursor).getUTCFullYear();

  const centerAt = (clientX: number, el: SVGSVGElement) => {
    const px = clientX - el.getBoundingClientRect().left;
    onCenter(base.invert(Math.min(r1, Math.max(r0, px))));
  };

  const btn = "grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPlayToggle}
        className="flex h-8 shrink-0 items-center gap-2 rounded-full bg-ink pl-2.5 pr-3.5 text-[12.5px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.97]"
        aria-label={playing ? "Pause the replay" : "Replay history from 2017"}
      >
        {playing ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
        <span className="w-9 text-left tabular-nums">{year ?? "Play"}</span>
      </button>

      <svg
        width={stripW}
        height={H}
        className="block shrink-0 cursor-ew-resize touch-none select-none"
        role="img"
        aria-label="Overview of the full timeline. Click or drag to move the view."
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          centerAt(e.clientX, e.currentTarget);
        }}
        onPointerMove={(e) => dragging.current && centerAt(e.clientX, e.currentTarget)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <rect x={r0} y={1} width={r1 - r0} height={H - 2} rx={6} fill="#f2f0ea" />
        {years.map((t) => (
          <g key={t.getTime()} transform={`translate(${base(t)},0)`}>
            <line y1={2} y2={H - 2} stroke="#e5e1d8" />
            <text x={4} y={12} fontSize={9.5} fill="#8a867d" style={{ fontVariantNumeric: "tabular-nums" }}>
              {format(t)}
            </text>
          </g>
        ))}
        {marks.map((m) => (
          <line key={m.id} x1={base(m.date)} x2={base(m.date)} y1={16} y2={H - 5} stroke={m.color} strokeWidth={1.4} opacity={m.dim ? 0.2 : 0.85} />
        ))}
        {cursor !== null && <line x1={base(new Date(cursor))} x2={base(new Date(cursor))} y1={1} y2={H - 1} stroke="#c8391f" strokeWidth={1.5} />}
        <rect x={vx0} y={0.75} width={Math.max(4, vx1 - vx0)} height={H - 1.5} rx={6} fill="rgb(27 26 23 / 0.04)" stroke="#1b1a17" strokeWidth={1.25} />
      </svg>

      <div className="ml-auto flex shrink-0 items-center rounded-xl border border-rule bg-card">
        <button type="button" className={btn} onClick={() => onZoom(1 / 1.8)} aria-label="Zoom out">
          <MinusIcon />
        </button>
        <button type="button" className={btn} onClick={() => onZoom(1.8)} aria-label="Zoom in">
          <PlusIcon />
        </button>
        <button type="button" className={btn} onClick={onReset} aria-label="Show the whole timeline">
          <ExpandIcon />
        </button>
      </div>
    </div>
  );
}
