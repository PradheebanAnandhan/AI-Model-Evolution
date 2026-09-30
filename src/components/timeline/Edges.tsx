import type { Edge } from "@/lib/graph";
import type { RelationType } from "@/lib/schema";

/** Line styles by relation. The tiny dashes, with round caps, draw as dots. */
export const EDGE_DASH: Record<RelationType, string | undefined> = {
  "successor-of": undefined,
  "derived-from": "6 5",
  "distilled-from": "0.1 5",
  "inspired-by": "0.1 7",
};

export interface EdgePoint {
  x: number;
  y: number;
  org: string;
}

export type EdgeState = "normal" | "active" | "dim" | "gone";

export function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(18, Math.abs(x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

interface EdgesProps {
  edges: Edge[];
  points: Map<string, EdgePoint>;
  colors: Map<string, string>;
  stateOf: (e: Edge) => EdgeState;
  /** Changes whenever the highlighted lineage changes, so active lines redraw. */
  activeKey?: string;
}

const edgeKey = (e: Edge) => `${e.from}->${e.to}`;
const gradientId = (e: Edge) => `edge-${e.from}-${e.to}`.replace(/[^a-zA-Z0-9-]/g, "_");
const BASE_OPACITY: Record<RelationType, number> = {
  "successor-of": 0.72,
  "derived-from": 0.55,
  "distilled-from": 0.65,
  "inspired-by": 0.34,
};

/**
 * Lineage. Lines take the newer model's lab color; a line between labs blends from one
 * lab's color into the other's. The highlighted lineage brightens (its moving light is `FlowLines`).
 */
export function Edges({ edges, points, colors, stateOf, activeKey }: EdgesProps) {
  const items = edges.flatMap((e) => {
    const a = points.get(e.from);
    const b = points.get(e.to);
    if (!a || !b) return [];
    return [{ e, a, b, state: stateOf(e), cross: a.org !== b.org }];
  });

  return (
    <g aria-hidden="true" fill="none" strokeLinecap="round">
      <defs>
        {items
          .filter((it) => it.cross)
          .map(({ e, a, b }) => (
            <linearGradient key={gradientId(e)} id={gradientId(e)} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
              <stop offset="0" stopColor={colors.get(a.org) ?? "#8b9ab3"} />
              <stop offset="1" stopColor={colors.get(b.org) ?? "#8b9ab3"} />
            </linearGradient>
          ))}
      </defs>
      {items.map(({ e, a, b, state, cross }) => {
        const d = edgePath(a.x, a.y, b.x, b.y);
        const dash = EDGE_DASH[e.type];
        const stroke = cross ? `url(#${gradientId(e)})` : (colors.get(b.org) ?? "#8b9ab3");
        const successor = e.type === "successor-of";
        if (state === "active") {
          return (
            <g key={`${edgeKey(e)}-${activeKey}`}>
              <path d={d} stroke={stroke} strokeWidth={7} strokeOpacity={0.16} />
              <path d={d} pathLength={dash ? undefined : 1} className={dash ? undefined : "tl-draw"} stroke={stroke} strokeWidth={2.2} strokeDasharray={dash} />
            </g>
          );
        }
        return (
          <g key={edgeKey(e)} className={`tl-fade ${state === "dim" ? "tl-dim" : ""} ${state === "gone" ? "tl-gone" : ""}`}>
            {successor && <path d={d} stroke={stroke} strokeWidth={6} strokeOpacity={0.07} />}
            <path d={d} stroke={stroke} strokeWidth={successor ? 1.7 : 1.35} strokeOpacity={BASE_OPACITY[e.type] * (cross ? 0.85 : 1)} strokeDasharray={dash} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * Light travelling along the highlighted lineage, from the older model to the newer one. It lives
 * in its own layer above the chart, so the animation repaints a few paths instead of the whole chart.
 */
export function FlowLines({ edges, points, stateOf }: Pick<EdgesProps, "edges" | "points" | "stateOf">) {
  return (
    <g fill="none" strokeLinecap="round">
      {edges.map((e) => {
        const a = points.get(e.from);
        const b = points.get(e.to);
        if (!a || !b || EDGE_DASH[e.type] || stateOf(e) !== "active") return null;
        return <path key={edgeKey(e)} d={edgePath(a.x, a.y, b.x, b.y)} className="tl-flow" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={1.8} />;
      })}
    </g>
  );
}
