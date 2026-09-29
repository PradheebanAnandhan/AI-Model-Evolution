export interface Interval {
  id: string;
  start: number;
  end: number;
}

/**
 * Greedy interval packing: each interval goes into the first row whose last
 * interval ends at least `gap` before it starts. Returns id -> row index.
 */
export function packRows(items: Interval[], gap = 0): { rows: Map<string, number>; count: number } {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  const rowEnds: number[] = [];
  const rows = new Map<string, number>();
  for (const item of sorted) {
    let row = rowEnds.findIndex((end) => end + gap <= item.start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(item.end);
    } else {
      rowEnds[row] = item.end;
    }
    rows.set(item.id, row);
  }
  return { rows, count: rowEnds.length };
}

/** Approximate rendered width of a node pill, from its label. */
export function nodeWidth(label: string): number {
  return Math.round(label.length * 6.6 + 26);
}

export interface LayoutInput {
  id: string;
  lane: string;
  label: string;
  /** Pixel position of the release date. */
  x: number;
  /** Overrides the label-based width (e.g. for dot-only nodes). */
  width?: number;
}

export interface LaneBox {
  id: string;
  y: number;
  height: number;
  rows: number;
}

export interface NodeBox {
  id: string;
  lane: string;
  x: number;
  y: number;
  width: number;
  row: number;
}

export interface LayoutOptions {
  rowHeight: number;
  lanePadding: number;
  gap: number;
  top: number;
}

/**
 * Places nodes in their organization lane, stacking them into sub-rows where
 * they would overlap horizontally. Lanes with no nodes still get one row.
 */
export function layoutLanes(
  laneIds: string[],
  nodes: LayoutInput[],
  { rowHeight, lanePadding, gap, top }: LayoutOptions,
): { lanes: LaneBox[]; nodes: Map<string, NodeBox>; height: number } {
  const byLane = new Map<string, LayoutInput[]>();
  for (const n of nodes) {
    const list = byLane.get(n.lane);
    if (list) list.push(n);
    else byLane.set(n.lane, [n]);
  }

  const lanes: LaneBox[] = [];
  const boxes = new Map<string, NodeBox>();
  let y = top;
  for (const laneId of laneIds) {
    const laneNodes = byLane.get(laneId) ?? [];
    const widths = new Map(laneNodes.map((n) => [n.id, n.width ?? nodeWidth(n.label)]));
    const { rows, count } = packRows(
      laneNodes.map((n) => ({ id: n.id, start: n.x, end: n.x + widths.get(n.id)! })),
      gap,
    );
    const rowCount = Math.max(1, count);
    const height = rowCount * rowHeight + lanePadding * 2;
    for (const n of laneNodes) {
      const row = rows.get(n.id)!;
      boxes.set(n.id, {
        id: n.id,
        lane: laneId,
        x: n.x,
        y: y + lanePadding + row * rowHeight + rowHeight / 2,
        width: widths.get(n.id)!,
        row,
      });
    }
    lanes.push({ id: laneId, y, height, rows: rowCount });
    y += height;
  }
  return { lanes, nodes: boxes, height: y };
}
