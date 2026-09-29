import type { ScaleTime } from "d3-scale";
import type { Annotation } from "@/content/annotations";
import { formatDate } from "@/lib/format";
import { measureLabel } from "./measure";

export const AXIS_H = 28;
export const ANNOT_H = 70;

interface HeaderProps {
  x: ScaleTime<number, number>;
  width: number;
  left: number;
  today: Date;
  /** Current time cursor while growing or playing. */
  cursor: number | null;
  annotations: (Annotation & { date: string; t: number })[];
  onSelect: (id: string) => void;
}

const isYear = (t: Date) => t.getUTCMonth() === 0 && t.getUTCDate() === 1;

export function tickCount(width: number, left: number) {
  return Math.max(2, Math.floor((width - left) / 100));
}

/** The time axis plus the written annotation track beneath it. */
export function ChartHeader({ x, width, left, today, cursor, annotations, onSelect }: HeaderProps) {
  const n = tickCount(width, left);
  const ticks = x.ticks(n);
  const format = x.tickFormat(n);
  const tx = x(today);

  // Callouts go on one of two rows; one that fits on neither is left out.
  const rows: number[][] = [[], []];
  const callouts = annotations
    .filter((a) => cursor === null || a.t <= cursor)
    .map((a) => {
      const ax = x(new Date(a.t));
      const w = Math.max(measureLabel(a.text, 13, 400) * 1.02, measureLabel(formatDate(a.date), 11, 500)) + 12;
      return { ...a, ax, w };
    })
    .filter((a) => a.ax >= left && a.ax < width - 20)
    .sort((a, b) => a.ax - b.ax)
    .map((a) => {
      const end = a.ax + a.w;
      const row = rows.findIndex((r) => r.every((e) => e + 10 < a.ax));
      if (row === -1 || end > width - 4) return null;
      rows[row].push(end);
      return { ...a, row };
    })
    .filter((a) => a !== null);

  return (
    <svg width={width} height={AXIS_H + ANNOT_H} className="block">
      {ticks.map((t) => {
        const px = x(t);
        if (px < left + 8 || px > width - 8) return null;
        return (
          <g key={t.getTime()} transform={`translate(${px},0)`}>
            <line y1={AXIS_H - 6} y2={AXIS_H} stroke="#cfc9bd" />
            <text
              y={AXIS_H - 11}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={isYear(t) ? 600 : 400}
              fill={isYear(t) ? "#1b1a17" : "#8a867d"}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(t)}
            </text>
          </g>
        );
      })}
      <line x1={left} x2={width} y1={AXIS_H - 0.5} y2={AXIS_H - 0.5} stroke="#e5e1d8" />

      {tx > left && tx < width && (
        <g transform={`translate(${tx},0)`}>
          <line y1={AXIS_H - 8} y2={AXIS_H + ANNOT_H} stroke="#c8391f" strokeWidth={1} />
          {/* In the axis row, with a paper halo, so it never collides with annotations. */}
          <text
            x={-4}
            y={AXIS_H - 11}
            textAnchor="end"
            fontSize={10.5}
            fontWeight={700}
            letterSpacing="0.06em"
            fill="#c8391f"
            style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 5, strokeLinejoin: "round" }}
          >
            TODAY
          </text>
        </g>
      )}

      {callouts.map((a) => (
        <g
          key={a.model}
          transform={`translate(${a.ax},${AXIS_H})`}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`${a.text}, ${formatDate(a.date)}. Select model.`}
          onClick={() => onSelect(a.model)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(a.model);
            }
          }}
          style={{ animation: "label-in 300ms var(--ease-out) both" }}
        >
          <line y1={a.row === 0 ? 7 : 39} y2={ANNOT_H} stroke="#8a867d" strokeDasharray="2 2" />
          <circle cy={a.row === 0 ? 7 : 39} r={2} fill="#1b1a17" />
          <text x={6} y={a.row === 0 ? 11 : 43} fontSize={11} fontWeight={600} fill="#8a867d" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatDate(a.date)}
          </text>
          <text
            x={6}
            y={a.row === 0 ? 26 : 58}
            fontSize={13}
            fontStyle="italic"
            fill="#1b1a17"
            style={{ fontFamily: "var(--font-newsreader), Georgia, serif" }}
          >
            {a.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
