// Greedy, priority-ordered label placement for the timeline's direct labels.

export interface LabelRequest {
  id: string;
  /** Dot centre and radius. */
  x: number;
  y: number;
  r: number;
  /** Label box size. */
  width: number;
  height: number;
  /** Lower numbers are placed first. */
  priority: number;
  /** The label must stay inside this vertical band (its lane). */
  bandTop: number;
  bandBottom: number;
  /** Place even if nothing is free (hovered or selected models). */
  force?: boolean;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedLabel extends Box {
  id: string;
  /** Index of the candidate position used, fed back next frame for stability. */
  candidate: number;
}

export interface PlaceOptions {
  minX: number;
  maxX: number;
  /** Candidate used for each label last time; those labels are placed first and keep their spot if it's still free. */
  previous?: Map<string, number>;
  padding?: number;
}

/** Right of the dot, above it, below it, then left of it. */
export function candidateBoxes(l: LabelRequest): Box[] {
  const gap = 4;
  return [
    { x: l.x + l.r + gap, y: l.y - l.height / 2, w: l.width, h: l.height },
    { x: l.x - l.r, y: l.y - l.r - gap / 2 - l.height, w: l.width, h: l.height },
    { x: l.x - l.r, y: l.y + l.r + gap / 2, w: l.width, h: l.height },
    { x: l.x - l.r - gap - l.width, y: l.y - l.height / 2, w: l.width, h: l.height },
  ];
}

const hits = (a: Box, b: Box, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;

/**
 * Places as many labels as fit without overlapping each other or any obstacle
 * (typically the dots). Forced labels are always placed, using their first candidate
 * if nothing is free.
 */
export function placeLabels(requests: LabelRequest[], obstacles: (Box & { id?: string })[], opts: PlaceOptions): Map<string, PlacedLabel> {
  const pad = opts.padding ?? 2;
  const prev = opts.previous;
  const order = [...requests].sort(
    (a, b) =>
      Number(!!b.force) - Number(!!a.force) ||
      a.priority - b.priority ||
      Number(prev?.has(b.id) ?? false) - Number(prev?.has(a.id) ?? false) ||
      a.x - b.x,
  );

  const placed = new Map<string, PlacedLabel>();
  const taken: Box[] = [];

  for (const l of order) {
    const boxes = candidateBoxes(l);
    const tryOrder = [0, 1, 2, 3];
    const last = prev?.get(l.id);
    if (last !== undefined) tryOrder.sort((a, b) => Number(b === last) - Number(a === last));

    let chosen: number | undefined;
    for (const i of tryOrder) {
      const b = boxes[i];
      if (b.x < opts.minX || b.x + b.w > opts.maxX || b.y < l.bandTop || b.y + b.h > l.bandBottom) continue;
      if (taken.some((t) => hits(b, t, pad))) continue;
      if (obstacles.some((o) => o.id !== l.id && hits(b, o, 0))) continue;
      chosen = i;
      break;
    }
    if (chosen === undefined && l.force) chosen = last ?? 0;
    if (chosen === undefined) continue;

    const b = boxes[chosen];
    taken.push(b);
    placed.set(l.id, { id: l.id, ...b, candidate: chosen });
  }
  return placed;
}
