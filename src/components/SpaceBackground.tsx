"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** A small seeded PRNG, so server and client render the same twinkling stars. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(7);
const TWINKLERS = Array.from({ length: 26 }, () => ({
  left: rand() * 100,
  top: rand() * 100,
  size: 1.5 + rand() * 1.6,
  d: 3 + rand() * 4,
  delay: -rand() * 6,
  tint: rand() > 0.6 ? "#c7d2ff" : "#ffffff",
}));

/** The fixed starfield behind every page: a canvas of faint stars, a few twinkling ones, and nebula glows. */
export function SpaceBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const r = mulberry32(42);
      const n = Math.round((w * h) / 2600);
      for (let i = 0; i < n; i++) {
        const x = r() * w;
        const y = r() * h;
        const big = r() > 0.94;
        const size = big ? 0.9 + r() * 0.7 : 0.35 + r() * 0.55;
        const alpha = big ? 0.55 + r() * 0.4 : 0.15 + r() * 0.45;
        const hue = r();
        ctx.fillStyle = hue > 0.8 ? `rgba(180,195,255,${alpha})` : hue > 0.7 ? `rgba(215,190,255,${alpha})` : `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(60% 45% at 78% -4%, rgb(96 84 240 / 0.22), transparent 70%)",
            "radial-gradient(45% 40% at 8% 18%, rgb(40 90 220 / 0.14), transparent 70%)",
            "radial-gradient(40% 35% at 55% 55%, rgb(150 80 230 / 0.07), transparent 70%)",
            "radial-gradient(35% 30% at 95% 70%, rgb(30 150 220 / 0.07), transparent 70%)",
          ].join(","),
        }}
      />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {TWINKLERS.map((s, i) => (
        <span
          key={i}
          className="star absolute rounded-full"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              background: s.tint,
              boxShadow: `0 0 ${s.size * 4}px ${s.tint}`,
              "--d": `${s.d}s`,
              "--delay": `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A planet's rim rising at the bottom of the screen, behind the full-screen app pages. */
export function Horizon() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[34vh] overflow-hidden">
      <div
        className="absolute left-1/2 top-[58%] aspect-square w-[240vw] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(closest-side, #050914 92%, #0a1733 97%, #173a78 99.3%, #7fb2ff 100%)",
          boxShadow: "0 -8px 60px rgb(80 140 255 / 0.35), 0 -2px 18px rgb(140 190 255 / 0.4)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "radial-gradient(60% 100% at 50% 100%, rgb(60 110 255 / 0.12), transparent 70%)" }} />
    </div>
  );
}
