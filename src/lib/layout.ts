/**
 * Spreads nodes that would overlap on a row's centre line across `slots` parallel lines
 * (0 is the centre, then alternately above and below). Nodes are taken left to right; each
 * goes on the first line whose previous node is at least `minGap` px away, or, if none is,
 * on the line that frees up soonest. Returns id -> slot.
 */
export function assignSlots(items: { id: string; x: number }[], minGap: number, slots = 3): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
  const last = new Array<number>(slots).fill(-Infinity);
  const out = new Map<string, number>();
  for (const item of sorted) {
    let slot = last.findIndex((x) => item.x - x >= minGap);
    if (slot === -1) slot = last.indexOf(Math.min(...last));
    last[slot] = item.x;
    out.set(item.id, slot);
  }
  return out;
}

/** Vertical offset of a slot from the centre line: 0, -step, +step, -2·step, … */
export function slotOffset(slot: number, step: number): number {
  if (slot === 0) return 0;
  return (slot % 2 === 1 ? -1 : 1) * Math.ceil(slot / 2) * step;
}
