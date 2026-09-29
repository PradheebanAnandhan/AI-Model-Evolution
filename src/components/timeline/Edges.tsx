import type { Edge } from "@/lib/graph";
import type { RelationType } from "@/lib/schema";

export const EDGE_DASH: Record<RelationType, string | undefined> = {
  "successor-of": undefined,
  "derived-from": "5 3",
  "distilled-from": "1.5 3",
  "inspired-by": "1 4",
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

/** Lineage: hairlines at rest; the highlighted lineage redraws in the child's lab color. */
export function Edges({ edges, points, colors, stateOf, activeKey }: EdgesProps) {
  return (
    <g aria-hidden="true" fill="none" strokeLinecap="round">
      {edges.map((e) => {
        const a = points.get(e.from);
        const b = points.get(e.to);
        if (!a || !b) return null;
        const state = stateOf(e);
        const d = edgePath(a.x, a.y, b.x, b.y);
        const dash = EDGE_DASH[e.type];
        if (state === "active") {
          return (
            <path
              key={`${edgeKey(e)}-${activeKey}`}
              d={d}
              pathLength={dash ? undefined : 1}
              className={dash ? undefined : "tl-draw"}
              stroke={colors.get(b.org) ?? "#57544d"}
              strokeWidth={1.8}
              strokeDasharray={dash}
            />
          );
        }
        const cross = a.org !== b.org;
        return (
          <path
            key={edgeKey(e)}
            d={d}
            className={`tl-fade ${state === "dim" ? "tl-dim" : ""} ${state === "gone" ? "tl-gone" : ""}`}
            stroke={cross ? "#b3ac9f" : "#cfc9bd"}
            strokeWidth={cross ? 1.1 : 1}
            strokeDasharray={dash}
            opacity={e.type === "inspired-by" ? 0.75 : 1}
          />
        );
      })}
    </g>
  );
}
