"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * The record's header art: a wireframe world in the lab's color, ringed by orbits. Each model
 * gets its own tilt and particles from its id. Purely decorative.
 */
export function ModelOrb({ seed, color }: { seed: string; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rand = mulberry32(hash(seed));
    const rings = [
      { rx: 1.75, ry: 0.4, tilt: -0.32 + rand() * 0.2, speed: 0.22 + rand() * 0.18 },
      { rx: 1.38, ry: 0.3, tilt: 0.28 + rand() * 0.22, speed: -(0.16 + rand() * 0.18) },
    ];
    const particles = Array.from({ length: 64 }, () => ({ ring: rand() < 0.55 ? 0 : 1, a: rand() * Math.PI * 2, size: 0.5 + rand() * 1.3, drift: (rand() - 0.5) * 0.07 }));
    const stars = Array.from({ length: 46 }, () => ({ x: rand(), y: rand(), size: 0.3 + rand() * 0.9, a: 0.2 + rand() * 0.6, phase: rand() * 6 }));
    const spin = 0.12 + rand() * 0.1;

    let raf = 0;
    let visible = true;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ringPoint = (ring: (typeof rings)[number], a: number, cx: number, cy: number, R: number) => {
      const lx = Math.cos(a) * ring.rx * R;
      const ly = Math.sin(a) * ring.ry * R;
      return { x: cx + lx * Math.cos(ring.tilt) - ly * Math.sin(ring.tilt), y: cy + lx * Math.sin(ring.tilt) + ly * Math.cos(ring.tilt), front: Math.sin(a) > 0 };
    };

    const drawRing = (ring: (typeof rings)[number], cx: number, cy: number, R: number, front: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ring.tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx * R, ring.ry * R, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = rgba(color, front ? 0.75 : 0.28);
      ctx.lineWidth = front ? 1.3 : 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = front ? 10 : 0;
      ctx.stroke();
      ctx.restore();
    };

    const drawParticles = (t: number, cx: number, cy: number, R: number, front: boolean) => {
      for (const p of particles) {
        const ring = rings[p.ring];
        const pt = ringPoint(ring, p.a + t * ring.speed, cx, cy, R * (1 + p.drift));
        if (pt.front !== front) continue;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = front ? "rgba(255,255,255,0.9)" : rgba(color, 0.45);
        ctx.shadowColor = color;
        ctx.shadowBlur = front ? 6 : 0;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    let drawn = -Infinity;
    const draw = (now: number) => {
      // 30 frames a second is plenty for a slow orbit, and halves the work.
      if (!reduceMotion && now - drawn < 32) {
        if (visible) raf = requestAnimationFrame(draw);
        return;
      }
      drawn = now;
      const t = reduceMotion ? 0 : now / 1000;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + 2;
      const R = Math.min(h * 0.3, w * 0.2);

      // Background glow and stars.
      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(w, h) * 0.65);
      glow.addColorStop(0, rgba(color, 0.28));
      glow.addColorStop(0.45, rgba(color, 0.07));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        ctx.fillStyle = `rgba(255,255,255,${s.a * (0.6 + 0.4 * Math.sin(t * 1.3 + s.phase))})`;
        ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
      }

      for (const ring of rings) drawRing(ring, cx, cy, R, false);
      drawParticles(t, cx, cy, R, false);

      // The world: a lit sphere with a turning wireframe.
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, rgba("#ffffff", 0.85));
      body.addColorStop(0.18, rgba(color, 0.85));
      body.addColorStop(0.7, rgba(color, 0.28));
      body.addColorStop(1, "rgba(6,9,20,0.95)");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.shadowColor = color;
      ctx.shadowBlur = 28;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 7; i++) {
        const phi = ((i / 7) * Math.PI + t * spin) % Math.PI;
        const rx = Math.abs(Math.cos(phi)) * R;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(0.5, rx), R, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.18 * Math.sin(phi)})`;
        ctx.stroke();
      }
      for (let j = -2; j <= 2; j++) {
        const th = (j / 3) * (Math.PI / 2);
        const yy = cy + Math.sin(th) * R;
        const rx = Math.cos(th) * R;
        ctx.beginPath();
        ctx.ellipse(cx, yy, rx, rx * 0.16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.stroke();
      }
      ctx.restore();

      for (const ring of rings) drawRing(ring, cx, cy, R, true);
      drawParticles(t, cx, cy, R, true);

      if (!reduceMotion && visible) raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(0);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && !document.hidden;
      if (visible && !was && !reduceMotion) raf = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [seed, color, reduceMotion]);

  return <canvas ref={ref} aria-hidden="true" className="block h-full w-full" />;
}
