import { EDGE_DASH } from "./Edges";

const EDGE_ITEMS = [
  { type: "successor-of", label: "Successor" },
  { type: "derived-from", label: "Fine-tune" },
  { type: "distilled-from", label: "Distilled" },
] as const;

/** How to read the chart: node fills and line styles. */
export function Legend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-ink-3 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill="#b9c2dc" />
          <circle cx="6" cy="6" r="2.2" fill="#fff" />
        </svg>
        Open weights
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="4.3" fill="#070b16" stroke="#b9c2dc" strokeWidth="2" />
        </svg>
        Closed
      </span>
      {EDGE_ITEMS.map((item) => (
        <span key={item.type} className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="2" x2="20" y1="4" y2="4" stroke="#b9c2dc" strokeWidth="1.8" strokeDasharray={EDGE_DASH[item.type]} strokeLinecap="round" />
          </svg>
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <rect x="1.8" y="1.8" width="6.4" height="6.4" transform="rotate(45 5 5)" fill="#c9bfff" />
        </svg>
        Turning point
      </span>
    </div>
  );
}
