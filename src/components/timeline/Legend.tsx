import { EDGE_DASH } from "./Edges";

const EDGE_ITEMS = [
  { type: "successor-of", label: "Successor" },
  { type: "derived-from", label: "Derived" },
  { type: "distilled-from", label: "Distilled" },
] as const;

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill="#57544d" />
        </svg>
        Open weights
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.2" fill="#fff" stroke="#57544d" strokeWidth="1.8" />
        </svg>
        Closed
      </span>
      <span className="hidden h-3 w-px bg-rule-2 sm:block" aria-hidden="true" />
      {EDGE_ITEMS.map((item) => (
        <span key={item.type} className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" x2="21" y1="4" y2="4" stroke="#8a867d" strokeWidth="1.5" strokeDasharray={EDGE_DASH[item.type]} strokeLinecap="round" />
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}
