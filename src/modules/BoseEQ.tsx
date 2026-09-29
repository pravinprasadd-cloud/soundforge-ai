import Card from '@/components/Card';
import Knob from '@/components/Knob';
import { BANDS, PRESETS } from '@/audio/presets';
import { useStore } from '@/store';
import { engine } from '@/audio/engine';
import { useState } from 'react';

export default function BoseEQ() {
  const { bands, setBands, setBand } = useStore();
  const [activePreset, setActivePreset] = useState<string>('Flat');

  const applyPreset = async (name: string) => {
    const p = PRESETS[name];
    if (!p) return;
    setActivePreset(name);
    setBands(p);
    await engine.ensureRunning();
    engine.setBands(p);
  };

  const changeBand = async (i: number, v: number) => {
    setBand(i, v);
    setActivePreset(''); // custom — clear preset highlight
    await engine.ensureRunning();
    const next = [...bands];
    next[i] = v;
    engine.setBands(next);
  };

  const presetList = [
    'Flat',
    'Bose Signature',
    'Deep Bass',
    'Podcast',
    'Cinema',
    'Vocal',
    'Concert Hall',
  ];

  return (
    <div className="space-y-4">
      <Card title="Bose-inspired Adaptive EQ">
        {/* ── PRESET CHIPS ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {presetList.map(p => {
            const active = activePreset === p;
            return (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  active
                    ? 'bg-neon-lime text-black shadow-[0_0_12px_rgba(163,255,18,0.6)]'
                    : 'glass text-slate-300 hover:bg-white/10'
                }`}
              >
                {active && '✓ '}{p}
              </button>
            );
          })}
        </div>

        {/* ── KNOBS ── */}
        <div className="flex justify-between items-start gap-2 overflow-x-auto pb-4">
          {BANDS.map((f, i) => (
            <div key={f} className="flex flex-col items-center">
              <Knob
                value={bands[i]}
                min={-12}
                max={12}
                onChange={(v) => changeBand(i, v)}
              />
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                {f >= 1000 ? `${f / 1000}k` : f}
              </div>
            </div>
          ))}
        </div>

        {/* ── LIVE STATUS BAR ── */}
        <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className={`w-2 h-2 rounded-full ${engine.ctx?.state === 'running' ? 'bg-neon-lime animate-pulse' : 'bg-slate-600'}`} />
          <span>DSP: {engine.ctx?.state || 'idle'}</span>
          <span>·</span>
          <span>Filters: {engine.filters.length}</span>
          <span>·</span>
          <span>Preset: {activePreset || 'Custom'}</span>
        </div>
      </Card>

      <Card title="Room Calibration">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Listening Env</div>
            <div className="text-neon-cyan mt-1">Detected: Living Room</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Bass Adjust</div>
            <div className="text-neon-lime mt-1">Auto +2 dB</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs text-slate-400">Balance</div>
            <div className="text-neon-pink mt-1">Balanced L/R</div>
          </div>
        </div>
      </Card>
    </div>
  );
}