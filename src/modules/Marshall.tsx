import Card from '@/components/Card';
import Knob from '@/components/Knob';
import { useState } from 'react';
import { PRESETS } from '@/audio/presets';
import { engine } from '@/audio/engine';
import { useStore } from '@/store';

export default function Marshall() {
  const { setBands } = useStore();
  const [bass, setBass] = useState(5);
  const [mid, setMid] = useState(7);
  const [treble, setTreble] = useState(4);
  const [presence, setPresence] = useState(5);
  const [gain, setGain] = useState(6);
  const [activePreset, setActivePreset] = useState('');

  const apply = async (name: string) => {
    const p = PRESETS[name];
    if (!p) return;
    setActivePreset(name);
    setBands(p);
    await engine.ensureRunning();
    engine.setBands(p);

    // Reflect the preset on the 5 labeled knobs (visual feedback)
    setBass(p[0]);
    setMid(p[4]);
    setTreble(p[8]);
    setPresence(p[7]);
    setGain(p[5]);
  };

  const presetList = [
    'Rock Arena',
    'Classic Marshall Stack',
    'Blues Club',
    'Metal Lead',
    'British Crunch',
  ];

  // Manual knob → push to engine as 11-band curve
  const pushToEngine = async () => {
    setActivePreset('');
    await engine.ensureRunning();
    const curve = [bass, bass, bass, mid, mid, gain, mid, presence, treble, treble, treble];
    setBands(curve);
    engine.setBands(curve);
  };

  return (
    <div className="space-y-4">
      <Card title="Marshall Vintage Tuning" className="bg-gradient-to-br from-marsh-dark/80 to-black border-marsh">
        {/* ── PRESET CHIPS ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {presetList.map(p => {
            const active = activePreset === p;
            return (
              <button
                key={p}
                onClick={() => apply(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  active
                    ? 'bg-brass text-black border-brass shadow-[0_0_12px_rgba(201,169,97,0.7)]'
                    : 'bg-brass/10 text-brass border-brass/40 hover:bg-brass/20'
                }`}
              >
                {active && '✓ '}{p}
              </button>
            );
          })}
        </div>

        {/* ── BRASS KNOBS ── */}
        <div className="flex justify-around items-end gap-4 py-6">
          <Knob variant="brass" label="Bass"     value={bass}     min={0} max={12}
                onChange={(v) => { setBass(v); pushToEngine(); }} />
          <Knob variant="brass" label="Mid"      value={mid}      min={0} max={12}
                onChange={(v) => { setMid(v); pushToEngine(); }} />
          <Knob variant="brass" label="Treble"   value={treble}   min={0} max={12}
                onChange={(v) => { setTreble(v); pushToEngine(); }} />
          <Knob variant="brass" label="Presence" value={presence} min={0} max={12}
                onChange={(v) => { setPresence(v); pushToEngine(); }} />
          <Knob variant="brass" label="Gain"     value={gain}     min={0} max={12}
                onChange={(v) => { setGain(v); pushToEngine(); }} />
        </div>

        {/* ── LIVE STATUS ── */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-brass/60">
          <span className={`w-2 h-2 rounded-full ${engine.ctx?.state === 'running' ? 'bg-brass animate-pulse' : 'bg-slate-600'}`} />
          <span>Tube: {engine.ctx?.state || 'idle'}</span>
          <span>·</span>
          <span>Preset: {activePreset || 'Custom'}</span>
        </div>
      </Card>

      <Card title="Tube Saturation Emulation">
        <div className="text-xs text-slate-400 space-y-1">
          <div>🎸 Harmonic distortion: <span className="text-brass">Vintage 2nd-order</span></div>
          <div>🎚️ Dynamic loudness compensation: <span className="text-brass">Enabled</span></div>
          <div>🔊 Analog warmth curve: <span className="text-brass">{activePreset || 'Manual'}</span></div>
        </div>
      </Card>
    </div>
  );
}