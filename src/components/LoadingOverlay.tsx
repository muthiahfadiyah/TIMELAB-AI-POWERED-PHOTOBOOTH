// src/components/LoadingOverlay.tsx

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface LoadingOverlayProps {
  progress: number;
  capturedImage?: string | null;
  isPortrait?: boolean;
}

const MESSAGES = [
  "Analyzing facial geometry...",
  "Mapping neural pathways...",
  "Applying style transfer...",
  "Synthesizing visual identity...",
  "Rendering final output...",
];

// ── Digitalize canvas ────────────────────────────────────────────────────────
interface Pixel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  isRed: boolean;
}

function DigitalizeCanvas({ photoSize }: { photoSize: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const C = photoSize;
    const R = C / 2;
    const GRID = 6; // ukuran sel grid analisis
    const SCAN_DUR = 1800; // ms per sweep scan

    // Pool partikel yang "diekstrak" dari scan line
    const pixels: Pixel[] = [];
    const MAX_PIXELS = 160;

    // Baris yang sedang aktif (flash)
    const activeRows: Map<number, number> = new Map(); // row → ttl (frame)

    // Row flash random
    let rowFlashTimer = 0;

    let raf: number;
    let lastTs = 0;

    const spawnPixel = (x: number, y: number) => {
      if (pixels.length >= MAX_PIXELS) return;
      pixels.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -Math.random() * 1.2 - 0.2,
        opacity: 0.55 + Math.random() * 0.3,
        size: Math.random() > 0.5 ? 2 : 3,
        isRed: Math.random() > 0.7,
      });
    };

    const draw = (ts: number) => {
      const dt = ts - lastTs;
      lastTs = ts;

      ctx.clearRect(0, 0, C, C);
      ctx.save();
      ctx.beginPath();
      ctx.arc(R, R, R - 1, 0, Math.PI * 2);
      ctx.clip();

      // ── 1. Faint analysis grid ──────────────────────────────────────────
      ctx.strokeStyle = "rgba(211,42,48,0.07)";
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < C; gx += GRID) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, C);
        ctx.stroke();
      }
      for (let gy = 0; gy < C; gy += GRID) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(C, gy);
        ctx.stroke();
      }

      // ── 2. Row flash highlight ─────────────────────────────────────────
      rowFlashTimer -= dt;
      if (rowFlashTimer <= 0) {
        rowFlashTimer = 120 + Math.random() * 200;
        const ry = Math.floor(Math.random() * (C / GRID)) * GRID;
        activeRows.set(ry, 18); // 18 frame ttl
      }
      for (const [ry, ttl] of activeRows) {
        const alpha = (ttl / 18) * 0.18;
        ctx.fillStyle = `rgba(211,42,48,${alpha})`;
        ctx.fillRect(0, ry, C, GRID);
        activeRows.set(ry, ttl - 1);
        if (ttl <= 1) activeRows.delete(ry);
      }

      // ── 3. Vertical scan line sweeping ────────────────────────────────
      const scanPhase = (ts % SCAN_DUR) / SCAN_DUR; // 0..1
      const scanX = scanPhase * C;

      // Spawn pixels along scan line
      if (Math.random() < 0.6) {
        const attempts = 3;
        for (let i = 0; i < attempts; i++) {
          const sy = Math.random() * C;
          const dx = scanX - R,
            dy = sy - R;
          if (dx * dx + dy * dy < R * R) {
            spawnPixel(scanX + (Math.random() - 0.5) * 4, sy);
          }
        }
      }

      // Draw scan line glow
      const grad = ctx.createLinearGradient(scanX - 10, 0, scanX + 10, 0);
      grad.addColorStop(0, "rgba(211,42,48,0)");
      grad.addColorStop(0.4, "rgba(211,42,48,0.18)");
      grad.addColorStop(0.5, "rgba(255,80,80,0.55)");
      grad.addColorStop(0.6, "rgba(211,42,48,0.18)");
      grad.addColorStop(1, "rgba(211,42,48,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 10, 0, 20, C);

      // Bright core line
      ctx.strokeStyle = "rgba(255,120,120,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, C);
      ctx.stroke();

      // ── 4. Drifting extracted pixels ──────────────────────────────────
      for (let i = pixels.length - 1; i >= 0; i--) {
        const p = pixels[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.015; // gravity ringan
        p.opacity -= 0.012;

        if (p.opacity <= 0) {
          pixels.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.isRed ? "#D32A30" : "rgba(255,255,255,0.9)";
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }

      // ── 5. Scattered static noise dots (sangat kecil, transparan) ──────
      ctx.globalAlpha = 1;
      const NOISE = 28;
      for (let n = 0; n < NOISE; n++) {
        const nx = Math.random() * C;
        const ny = Math.random() * C;
        const ndx = nx - R,
          ndy = ny - R;
        if (ndx * ndx + ndy * ndy > R * R) continue;
        ctx.globalAlpha = Math.random() * 0.2;
        ctx.fillStyle = Math.random() > 0.8 ? "#D32A30" : "#ffffff";
        ctx.fillRect(Math.round(nx), Math.round(ny), 2, 2);
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [photoSize]);

  return (
    <canvas
      ref={canvasRef}
      width={photoSize}
      height={photoSize}
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{ mixBlendMode: "screen", zIndex: 10 }}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  progress,
  capturedImage,
  isPortrait = false,
}) => {
  const [msgIndex, setMsgIndex] = React.useState(0);

  React.useEffect(() => {
    const iv = setInterval(
      () => setMsgIndex((i: number) => (i + 1) % MESSAGES.length),
      2200,
    );
    return () => clearInterval(iv);
  }, []);

  const SIZE = isPortrait ? 460 : 300;
  const STROKE = isPortrait ? 10 : 8;
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (Math.min(progress, 100) / 100) * circumference;

  // Photo circle inner size (matches inset: STROKE + 12)
  const photoSize = SIZE - (STROKE + 12) * 2;

  return (
    <div className="flex flex-col items-center justify-center py-16 min-h-[500px] gap-10 select-none">
      {/* Ring + photo — container pas SIZE, overflow visible agar glow & drop-shadow tidak terpotong */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: SIZE, height: SIZE, overflow: "visible" }}
      >
        {/* Outer glow pulse — inset negatif agar menonjol keluar ring */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -40,
            background:
              "radial-gradient(circle, rgba(211,42,48,0.15) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* SVG ring — overflow visible agar drop-shadow arc tidak terpotong di tepi SVG */}
        <svg
          width={SIZE}
          height={SIZE}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="#D32A30"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ type: "spring", stiffness: 35, damping: 16 }}
            style={{
              filter:
                "drop-shadow(0 0 12px rgba(211,42,48,0.95)) drop-shadow(0 0 4px rgba(255,80,80,0.8))",
            }}
          />
        </svg>

        {/* Photo circle — inset relatif terhadap SIZE, posisi tetap benar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute rounded-full overflow-hidden"
          style={{
            inset: STROKE + 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#0a0a10",
          }}
        >
          {capturedImage ? (
            <img
              src={capturedImage}
              alt=""
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full bg-white/5" />
          )}

          {/* Digitalize particle canvas */}
          <DigitalizeCanvas photoSize={photoSize} />
        </motion.div>
      </div>

      {/* Percentage + labels */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-end gap-1 leading-none">
          <motion.span
            className={
              isPortrait
                ? "text-8xl font-black text-white tracking-tighter"
                : "text-6xl font-black text-white tracking-tighter"
            }
            key={Math.floor(progress / 5)}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
          >
            {Math.floor(progress)}
          </motion.span>
          <span
            className={
              isPortrait
                ? "text-4xl font-bold text-[#D32A30] mb-2"
                : "text-2xl font-bold text-[#D32A30] mb-1.5"
            }
          >
            %
          </span>
        </div>

        <div className="h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className={
                isPortrait
                  ? "text-xs font-mono uppercase tracking-[0.22em] text-white/35 text-center"
                  : "text-[10px] font-mono uppercase tracking-[0.22em] text-white/35 text-center"
              }
            >
              {MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div
          className={
            isPortrait
              ? "w-72 rounded-full overflow-visible mt-1"
              : "w-48 rounded-full overflow-visible mt-1"
          }
          style={{ height: 3, background: "rgba(255,255,255,0.06)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #D32A30, #FF5555)",
              boxShadow:
                "0 0 10px 2px rgba(211,42,48,0.7), 0 0 24px 4px rgba(211,42,48,0.35)",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 40 }}
          />
        </div>
      </div>
    </div>
  );
};
