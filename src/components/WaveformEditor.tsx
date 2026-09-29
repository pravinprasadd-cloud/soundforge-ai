import { useEffect, useRef, useState } from 'react';

interface Props {
  audioBuffer: AudioBuffer | null;
  start: number;
  end: number;
  playhead?: number;
  onChangeStart: (s: number) => void;
  onChangeEnd: (e: number) => void;
}

export default function WaveformEditor({
  audioBuffer, start, end, playhead = 0, onChangeStart, onChangeEnd,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  // ── Draw waveform ────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (w <= 0 || h <= 0) return;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (!audioBuffer) {
      ctx.fillStyle = '#1c1c28';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Load an MP3 to begin', w / 2, h / 2);
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const dur = audioBuffer.duration;
    const step = Math.max(1, Math.floor(data.length / w));
    const mid = h / 2;

    // Waveform (thin grey bars)
    for (let x = 0; x < w; x++) {
      let min = 1, max = -1;
      const s = x * step;
      for (let i = 0; i < step; i++) {
        const v = data[s + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = mid + min * mid * 0.9;
      const yMax = mid + max * mid * 0.9;

      const xSec = (x / w) * dur;
      const inRange = xSec >= start && xSec <= end;
      ctx.fillStyle = inRange ? '#a3ff12' : 'rgba(180,180,200,0.35)';
      ctx.fillRect(x, yMin, 1, Math.max(1, yMax - yMin));
    }

    // Selection overlay edges
    const sx = (start / dur) * w;
    const ex = (end / dur) * w;

    ctx.fillStyle = 'rgba(163,255,18,0.06)';
    ctx.fillRect(sx, 0, ex - sx, h);

    ctx.strokeStyle = '#a3ff12';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
    ctx.moveTo(ex, 0); ctx.lineTo(ex, h);
    ctx.stroke();

    // Handle caps
    ctx.fillStyle = '#a3ff12';
    ctx.fillRect(sx - 4 * dpr, 0, 8 * dpr, 18 * dpr);
    ctx.fillRect(ex - 4 * dpr, h - 18 * dpr, 8 * dpr, 18 * dpr);

    // Playhead
    if (playhead > 0) {
      const px = (playhead / dur) * w;
      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(px, 0); ctx.lineTo(px, h);
      ctx.stroke();
    }
  }, [audioBuffer, start, end, playhead]);

  // ── Drag handlers ────────────────────────────────────
  const posToSec = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    return pct * audioBuffer.duration;
  };

  const onDown = (e: React.MouseEvent) => {
    if (!audioBuffer) return;
    const sec = posToSec(e.clientX);
    // Snap to nearest handle
    if (Math.abs(sec - start) < Math.abs(sec - end)) setDragging('start');
    else setDragging('end');
    setDragging(prev => {
      if (prev === 'start') onChangeStart(Math.min(sec, end - 0.5));
      else if (prev === 'end') onChangeEnd(Math.max(sec, start + 0.5));
      return prev;
    });
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      const sec = posToSec(e.clientX);
      if (dragging === 'start') onChangeStart(Math.min(sec, end - 0.5));
      else onChangeEnd(Math.max(sec, start + 0.5));
    };
    const up = () => setDragging(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [dragging, start, end, audioBuffer]);

  return (
    <div ref={wrapRef} className="relative rounded-xl overflow-hidden bg-ink-800 select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        className="w-full cursor-ew-resize block"
        style={{ height: 160 }}
      />
    </div>
  );
}