import { useLayoutEffect, useState, useSyncExternalStore } from "react";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Tweens a set of named numbers (row and lane positions) towards new targets
 * with a single rAF loop. Nodes and edges both read from it, so an edge stays
 * attached to its nodes while rows glide into a new packing.
 */
export class Tweener {
  private current = new Map<string, number>();
  private from = new Map<string, number>();
  private to = new Map<string, number>();
  private start = 0;
  private raf = 0;
  private version = 0;
  private listeners = new Set<() => void>();

  constructor(private duration = 560) {}

  /** Move towards `targets`; keys missing from `targets` keep their last value. */
  set(targets: Map<string, number>, animate: boolean) {
    let changed = targets.size !== this.to.size;
    if (!changed) {
      for (const [k, v] of targets) {
        if (this.to.get(k) !== v) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) return;

    if (!animate || this.current.size === 0) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      for (const [k, v] of targets) this.current.set(k, v);
      this.to = targets;
      this.emit();
      return;
    }
    this.from = new Map(this.current);
    for (const [k, v] of targets) if (!this.from.has(k)) this.from.set(k, v);
    this.to = targets;
    this.start = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  get(key: string): number | undefined {
    return this.current.get(key);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.listeners.clear();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  private tick = (now: number) => {
    const p = Math.min(1, (now - this.start) / this.duration);
    const e = easeInOutCubic(p);
    for (const [k, to] of this.to) {
      const from = this.from.get(k) ?? to;
      this.current.set(k, from + (to - from) * e);
    }
    this.emit();
    this.raf = p < 1 ? requestAnimationFrame(this.tick) : 0;
  };

  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }
}

/** Returns a tweener that follows `targets`, re-rendering the caller on every frame of a tween. */
export function useTweener(targets: Map<string, number>, animate: boolean, duration?: number): Tweener {
  const [tweener] = useState(() => new Tweener(duration));
  useSyncExternalStore(tweener.subscribe, tweener.getVersion, tweener.getVersion);
  useLayoutEffect(() => {
    tweener.set(targets, animate);
  }, [tweener, targets, animate]);
  useLayoutEffect(() => () => tweener.dispose(), [tweener]);
  return tweener;
}
