"use client";

interface YearRangeProps {
  min: number;
  max: number;
  from?: number;
  to?: number;
  /** Ends at the extremes come back as undefined (no limit). */
  onChange: (from: number | undefined, to: number | undefined) => void;
}

/** A two-handled year slider: two native range inputs sharing one track. */
export function YearRange({ min, max, from, to, onChange }: YearRangeProps) {
  const lo = from ?? min;
  const hi = to ?? max;
  const pct = (v: number) => ((v - min) / Math.max(1, max - min)) * 100;
  const set = (a: number, b: number) => onChange(a <= min ? undefined : a, b >= max ? undefined : b);

  return (
    <div className="flex h-10 items-center gap-3 rounded-xl border border-rule bg-glass px-3">
      <span className="w-9 text-[12.5px] font-medium tabular-nums text-ink-2">{lo}</span>
      <div className="relative h-5 w-36 xl:w-44">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#9d8cff,#5f8dff)] shadow-[0_0_10px_rgb(143_125_255/0.8)]"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={lo}
          aria-label="From year"
          onChange={(e) => set(Math.min(Number(e.target.value), hi), hi)}
          className="range-thumb absolute inset-0 h-5 w-full"
          style={{ zIndex: lo >= max ? 4 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={hi}
          aria-label="To year"
          onChange={(e) => set(lo, Math.max(Number(e.target.value), lo))}
          className="range-thumb absolute inset-0 h-5 w-full"
        />
      </div>
      <span className="w-9 text-right text-[12.5px] font-medium tabular-nums text-ink-2">{hi}</span>
    </div>
  );
}
