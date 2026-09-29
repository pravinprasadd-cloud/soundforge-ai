import { useEffect, useRef } from 'react';
import { engine } from '@/audio/engine';

/* =========================================================
   Shared hook — draws to a canvas at requestAnimationFrame
   ========================================================= */
function useVisualizer(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const loop = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (w > 0 && h > 0) {
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        tRef.current += 1 / 60;
        draw(ctx, w, h, tRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  return ref;
}

/* =========================================================
   1. POWERAMP BARS
   Vertical bars with glowing tips and peak-hold caps
   ========================================================= */
export function PowerampBars({ height = 200 }: { height?: number }) {
  const peaksRef = useRef<number[]>([]);

  const ref = useVisualizer((ctx, w, h) => {
    const spec = engine.spectrum();
    const N = 64;
    const gap = 2;
    const barW = (w - gap * (N - 1)) / N;
    const step = Math.max(1, Math.floor(spec.length / N));

    if (peaksRef.current.length !== N) peaksRef.current = new Array(N).fill(0);

    ctx.fillStyle = 'rgba(10,10,15,0.35)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += spec[i * step + j] || 0;
      const v = (sum / step) / 255;
      const barH = v * h * 0.92;

      const x = i * (barW + gap);
      const y = h - barH;

      // Bar gradient — Poweramp cyan→violet→pink
      const grd = ctx.createLinearGradient(0, h, 0, y);
      grd.addColorStop(0, '#3a0ca3');
      grd.addColorStop(0.5, '#7209b7');
      grd.addColorStop(1, '#f72585');
      ctx.fillStyle = grd;
      ctx.fillRect(x, y, barW, barH);

      // Peak-hold cap
      if (barH > peaksRef.current[i]) peaksRef.current[i] = barH;
      else peaksRef.current[i] = Math.max(0, peaksRef.current[i] - 1.5);

      ctx.fillStyle = '#a3ff12';
      ctx.shadowColor = '#a3ff12';
      ctx.shadowBlur = 8;
      ctx.fillRect(x, h - peaksRef.current[i] - 3, barW, 3);
      ctx.shadowBlur = 0;
    }
  });

  return <canvas ref={ref} style={{ width: '100%', height }} className="rounded-2xl" />;
}

/* =========================================================
   2. RADIAL SPECTRUM (Sunburst around vinyl)
   ========================================================= */
export function RadialSpectrum({ size = 260 }: { size?: number }) {
  const ref = useVisualizer((ctx, w, h) => {
    const spec = engine.spectrum();
    const cx = w / 2;
    const cy = h / 2;
    const N = 96;
    const rBase = Math.min(w, h) * 0.28;
    const step = Math.max(1, Math.floor(spec.length / N));

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,10,15,0.4)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += spec[i * step + j] || 0;
      const v = (sum / step) / 255;

      const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
      const r = rBase + v * rBase * 0.9;

      const x1 = cx + Math.cos(angle) * rBase;
      const y1 = cy + Math.sin(angle) * rBase;
      const x2 = cx + Math.cos(angle) * r;
      const y2 = cy + Math.sin(angle) * r;

      const hue = 280 - v * 120;
      ctx.strokeStyle = `hsl(${hue}, 100%, ${50 + v * 20}%)`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 8 * v;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // Central glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rBase);
    grd.addColorStop(0, 'rgba(163,255,18,0.15)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="rounded-full"
    />
  );
}

/* =========================================================
   3. OSCILLOSCOPE — true time-domain waveform
   ========================================================= */
export function Oscilloscope({ height = 140 }: { height?: number }) {
  const ref = useVisualizer((ctx, w, h) => {
    const analyser = engine.analyser;
    ctx.fillStyle = 'rgba(10,10,15,0.35)';
    ctx.fillRect(0, 0, w, h);

    if (!analyser) {
      // Flat line when idle
      ctx.strokeStyle = 'rgba(163,255,18,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);

    ctx.strokeStyle = '#a3ff12';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a3ff12';
    ctx.shadowBlur = 10;
    ctx.beginPath();

    const sliceW = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128;   // 0..2, centered at 1
      const y = (v * h) / 2;
      const x = i * sliceW;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  return <canvas ref={ref} style={{ width: '100%', height }} className="rounded-2xl" />;
}

/* =========================================================
   4. MIRROR BARS — symmetric from center
   ========================================================= */
export function MirrorBars({ height = 200 }: { height?: number }) {
  const ref = useVisualizer((ctx, w, h) => {
    const spec = engine.spectrum();
    const N = 48;
    const gap = 2;
    const barW = (w - gap * (N - 1)) / N;
    const step = Math.max(1, Math.floor(spec.length / N));
    const centerY = h / 2;

    ctx.fillStyle = 'rgba(10,10,15,0.3)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += spec[i * step + j] || 0;
      const v = (sum / step) / 255;
      const barH = v * (h / 2) * 0.92;

      const x = i * (barW + gap);

      // Upper half — cyan
      const grd1 = ctx.createLinearGradient(0, centerY, 0, centerY - barH);
      grd1.addColorStop(0, '#00e5ff');
      grd1.addColorStop(1, '#7209b7');
      ctx.fillStyle = grd1;
      ctx.fillRect(x, centerY - barH, barW, barH);

      // Lower half — pink (mirror)
      const grd2 = ctx.createLinearGradient(0, centerY, 0, centerY + barH);
      grd2.addColorStop(0, '#ff6b9d');
      grd2.addColorStop(1, '#3a0ca3');
      ctx.fillStyle = grd2;
      ctx.fillRect(x, centerY, barW, barH);
    }

    // Center line
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(0, centerY - 1, w, 2);
  });

  return <canvas ref={ref} style={{ width: '100%', height }} className="rounded-2xl" />;
}