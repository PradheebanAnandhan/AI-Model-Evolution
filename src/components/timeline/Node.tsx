import { memo } from "react";

export function nodeRadius(milestone: boolean, selected: boolean): number {
  return selected ? 8.5 : milestone ? 6.8 : 5.4;
}

interface NodeProps {
  id: string;
  ariaLabel: string;
  x: number;
  y: number;
  color: string;
  /** Id of the lab's radial glow gradient. */
  haloId: string;
  open: boolean;
  milestone: boolean;
  selected: boolean;
  featured: boolean;
  state: "normal" | "dim" | "gone";
  born: boolean;
  tabbable: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | undefined) => void;
  onFocusNode: (id: string) => void;
}

/** A release: a glowing orb, solid with a white-hot core for open weights, a ring for closed models. */
function NodeImpl({ id, ariaLabel, x, y, color, haloId, open, milestone, selected, featured, state, born, tabbable, onSelect, onHover, onFocusNode }: NodeProps) {
  const gone = state === "gone";
  const r = nodeRadius(milestone, selected);
  return (
    <g
      className={`tl-node tl-fade ${state === "dim" ? "tl-dim" : ""} ${gone ? "tl-gone" : ""} ${born ? "" : "tl-unborn"}`}
      data-model-id={id}
      transform={`translate(${x},${y})`}
      role="button"
      tabIndex={tabbable && !gone && born ? 0 : -1}
      aria-label={ariaLabel}
      aria-pressed={selected}
      aria-hidden={gone || !born || undefined}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(id)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(undefined)}
      onFocus={() => onFocusNode(id)}
    >
      <circle className="tl-halo" r={r * (selected ? 4.4 : featured ? 3.8 : 3.1)} fill={`url(#${haloId})`} />
      <circle className="tl-focus" r={r + 5} fill="none" />
      {(selected || featured) && <circle r={r + 6} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={1.2} />}
      <g className="tl-dot">
        {open ? (
          <>
            <circle r={r} fill={color} />
            <circle r={r * 0.46} fill="#fff" fillOpacity={0.92} />
          </>
        ) : (
          <>
            <circle r={r - 1.1} fill="#070b16" stroke={color} strokeWidth={2.2} />
            <circle r={Math.max(1.3, r * 0.26)} fill={color} />
          </>
        )}
      </g>
      {/* A generous invisible hit area. */}
      <circle r={Math.max(12, r + 5)} fill="transparent" />
    </g>
  );
}

export const Node = memo(NodeImpl);
