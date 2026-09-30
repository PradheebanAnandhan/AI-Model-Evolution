export interface MonthBin {
  /** First instant of the month (epoch ms, UTC). */
  start: number;
  /** Models released that month, oldest first. */
  ids: string[];
}

const monthStart = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};

/** One bin per calendar month from `from`'s month to `to`'s month, inclusive. */
export function monthBins(items: { id: string; t: number }[], from: number, to: number): MonthBin[] {
  const bins: MonthBin[] = [];
  const index = new Map<number, MonthBin>();
  const end = monthStart(to);
  for (let d = new Date(monthStart(from)); d.getTime() <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const bin = { start: d.getTime(), ids: [] };
    bins.push(bin);
    index.set(bin.start, bin);
  }
  for (const item of [...items].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
    index.get(monthStart(item.t))?.ids.push(item.id);
  }
  return bins;
}
