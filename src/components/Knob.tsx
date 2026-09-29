import { useRef } from 'react';

interface Props {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  variant?: 'dark' | 'brass';
  onChange: (v: number) => void;
}

export default function Knob({
  value, min = -12, max = 12, size = 72, label, variant = 'dark', onChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const onWheel = (e: React.WheelEvent) => {
    const step = (max - min) / 40;
    const next = Math.max(min, Math.min(max, value + (e.deltaY < 0 ? step : -step)));
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        onWheel={onWheel}
        className={`relative rounded-full knob ${variant === 'brass' ? 'knob-brass' : ''} cursor-ns-resize`}
        style={{ width: size, height: size }}
      >
        <div
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            width: 3,
            height: size * 0.35,
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: '50% 100%',
            background: variant === 'brass' ? '#2a1e08' : '#a3ff12',
            boxShadow: variant === 'brass' ? 'none' : '0 0 8px #a3ff12',
            borderRadius: 2,
          }}
        />
      </div>
      {label && <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>}
      <div className="text-[10px] font-mono text-neon-lime">{value.toFixed(1)}</div>
    </div>
  );
}