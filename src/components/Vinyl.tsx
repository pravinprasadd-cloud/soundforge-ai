import { useStore } from '@/store';

export default function Vinyl({ size = 256 }: { size?: number }) {
  const playing = useStore(s => s.playing);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={`w-full h-full rounded-full bg-gradient-to-br from-ink-700 to-black shadow-2xl ${
          playing ? 'vinyl-spin' : 'vinyl-spin vinyl-paused'
        }`}
      >
        <div className="absolute inset-[8%] rounded-full border border-white/5" />
        <div className="absolute inset-[16%] rounded-full border border-white/5" />
        <div className="absolute inset-[24%] rounded-full border border-white/5" />
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="rounded-full bg-gradient-to-br from-neon-pink to-neon-cyan grid place-items-center text-black font-bold"
            style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.06 }}
          >
            {playing ? '▶' : '❚❚'}
          </div>
        </div>
      </div>
      {/* Tonearm */}
      <div
        className="absolute bg-slate-500 rounded-full shadow-lg origin-left rotate-[-25deg]"
        style={{ width: size * 0.45, height: 3, right: -size * 0.15, top: '50%' }}
      />
    </div>
  );
}