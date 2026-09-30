import type { Annotation } from "@/content/annotations";
import { formatDate } from "@/lib/format";
import { measureLabel } from "./measure";

export const AXIS_H = 48;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEAR_Y = 17;
const FLAG_Y = 36;

interface AxisProps {
  /** Date to screen x. */
  x: (d: Date) => number;
  years: number[];
  left: number;
  width: number;
  /** Width of the lab column, under which the axis fades out. */
  gutter: number;
  today: Date;
  /** Current time cursor while growing or playing (-Infinity before the growth starts). */
  cursor: number | null;
  flags: (Annotation & { date: string; t: number })[];
  onSelect: (id: string) => void;
}

/** Years (with months once there's room), the turning points, and today. */
export function Axis({ x, years, left, width, gutter, today, cursor, flags, onSelect }: AxisProps) {
  const fade = `linear-gradient(to right, transparent ${gutter - 20}px, #000 ${gutter + 14}px)`;
  const tx = x(today);

  // Year labels sit on the year's first day; drop one that would crowd its neighbour.
  const yearMarks: { y: number; x0: number; labelled: boolean; months: { name: string; x: number; quarter: boolean }[]; monthLabels: "all" | "quarters" | "none" }[] = [];
  for (const y of years) {
    const x0 = x(new Date(Date.UTC(y, 0, 1)));
    const x1 = x(new Date(Date.UTC(y + 1, 0, 1)));
    if (x1 < left - 40 || x0 > width + 40) continue;
    const prev = yearMarks.findLast((m) => m.labelled);
    const labelled = x0 >= left - 6 && (!prev || x0 - prev.x0 >= 40);
    const span = x1 - x0;
    const months = span >= 220 ? MONTHS.slice(1).map((name, i) => ({ name, x: x(new Date(Date.UTC(y, i + 1, 1))), quarter: (i + 1) % 3 === 0 })) : [];
    yearMarks.push({ y, x0, labelled, months, monthLabels: span >= 640 ? "all" : span >= 300 ? "quarters" : "none" });
  }

  // Turning points: a diamond on the date, and a caption where it clears every other diamond and caption.
  const shown = flags
    .filter((f) => cursor === null || f.t <= cursor)
    .map((f) => ({ ...f, fx: x(new Date(f.t)) }))
    .filter((f) => f.fx >= left - 4 && f.fx <= width - 4)
    .sort((a, b) => a.fx - b.fx);
  const taken: { x0: number; x1: number; own?: string }[] = shown.map((f) => ({ x0: f.fx - 7, x1: f.fx + 7, own: f.model }));
  const marks = shown.map((f) => {
    const box = { x0: f.fx + 10, x1: f.fx + 10 + measureLabel(f.text, 11.5, 500) };
    const caption = box.x1 <= width - 6 && taken.every((p) => p.own === f.model || box.x1 + 6 < p.x0 || box.x0 > p.x1 + 6);
    if (caption) taken.push(box);
    return { ...f, caption };
  });

  // "Today" sits in the year row, left of its line, unless a year label is in the way.
  const todayBox = { x0: tx - 50, x1: tx - 6 };
  const showToday = tx > left + 50 && tx < width && yearMarks.every((m) => !m.labelled || m.x0 + 18 < todayBox.x0 || m.x0 - 18 > todayBox.x1);

  return (
    <svg width={width} height={AXIS_H} className="block select-none" style={{ maskImage: fade, WebkitMaskImage: fade }}>
      <defs>
        <radialGradient id="flag-glow">
          <stop offset="0" stopColor="#b3a6ff" stopOpacity={0.9} />
          <stop offset="1" stopColor="#b3a6ff" stopOpacity={0} />
        </radialGradient>
      </defs>

      {yearMarks.map((m) => (
        <g key={m.y}>
          {m.labelled && (
            <text x={m.x0} y={YEAR_Y} textAnchor="middle" fontSize={13} fontWeight={600} fill="#9ca6c2" style={{ fontVariantNumeric: "tabular-nums" }}>
              {m.y}
            </text>
          )}
          <line x1={m.x0} x2={m.x0} y1={YEAR_Y + 6} y2={YEAR_Y + 12} stroke="rgb(160 175 230 / 0.35)" />
          {m.months.map((mo) =>
            mo.x < left || mo.x > width ? null : (
              <g key={mo.name}>
                <line x1={mo.x} x2={mo.x} y1={YEAR_Y + 8} y2={YEAR_Y + 12} stroke="rgb(160 175 230 / 0.2)" />
                {(m.monthLabels === "all" || (m.monthLabels === "quarters" && mo.quarter)) && (
                  <text x={mo.x} y={YEAR_Y} textAnchor="middle" fontSize={10.5} fill="#6f7892">
                    {mo.name}
                  </text>
                )}
              </g>
            ),
          )}
        </g>
      ))}

      {marks.map((f) => (
        <g
          key={f.model}
          transform={`translate(${f.fx},${FLAG_Y})`}
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          aria-label={`${f.text}, ${formatDate(f.date)}. Select model.`}
          onClick={() => onSelect(f.model)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(f.model);
            }
          }}
          style={{ animation: "label-in 300ms var(--ease-out) both" }}
        >
          <title>{`${f.text} · ${formatDate(f.date)}`}</title>
          <circle r={9} fill="url(#flag-glow)" />
          <rect x={-3.6} y={-3.6} width={7.2} height={7.2} transform="rotate(45)" fill="#c9bfff" />
          {f.caption && (
            <text x={9} y={4} fontSize={11.5} fontWeight={500} fill="#b8c0d8">
              {f.text}
            </text>
          )}
        </g>
      ))}

      {tx > left && tx < width && (
        <g transform={`translate(${tx},0)`}>
          <line y1={YEAR_Y - 11} y2={AXIS_H} stroke="var(--today)" strokeWidth={1.5} strokeOpacity={0.8} />
          <circle cy={YEAR_Y - 11} r={2.5} fill="var(--today)" />
          {showToday && (
            <text x={-6} y={YEAR_Y - 1} textAnchor="end" fontSize={10} fontWeight={700} letterSpacing="0.08em" fill="var(--today)">
              TODAY
            </text>
          )}
        </g>
      )}

      {cursor !== null && Number.isFinite(cursor) && <line x1={x(new Date(cursor))} x2={x(new Date(cursor))} y1={0} y2={AXIS_H} stroke="var(--today)" strokeWidth={1.5} />}
    </svg>
  );
}
