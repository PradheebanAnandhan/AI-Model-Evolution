import { memo } from "react";

export const DOT_R = 5;

interface StationProps {
  id: string;
  ariaLabel: string;
  x: number;
  y: number;
  color: string;
  open: boolean;
  selected: boolean;
  state: "normal" | "dim" | "gone";
  born: boolean;
  tabbable: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | undefined) => void;
  onFocusNode: (id: string) => void;
}

/** A release on its lab's track: filled for open weights, a ring for closed. */
function StationImpl({ id, ariaLabel, x, y, color, open, selected, state, born, tabbable, onSelect, onHover, onFocusNode }: StationProps) {
  const gone = state === "gone";
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
      <circle className="tl-ring" r={12} fill={color} fillOpacity={0.14} />
      <circle className="tl-focus" r={10} fill="none" />
      {selected && <circle key={`pulse-${id}`} className="tl-pulse" r={7} fill="none" stroke={color} strokeWidth={2} />}
      <g className="tl-dot">
        {selected && <circle r={8.5} fill="#fff" stroke="#1b1a17" strokeWidth={1.6} />}
        {open ? (
          <circle r={DOT_R} fill={color} stroke="#fff" strokeWidth={1.5} />
        ) : (
          <circle r={DOT_R - 0.6} fill="#fff" stroke={color} strokeWidth={2} />
        )}
      </g>
      {/* A generous invisible hit area. */}
      <circle r={11} fill="transparent" />
    </g>
  );
}

export const Station = memo(StationImpl);
