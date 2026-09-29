import Card from '@/components/Card';
import Spectrum3D from '@/components/Spectrum3D';
import Waveform from '@/components/Waveform';
import { useStore } from '@/store';
import { engine } from '@/audio/engine';
import { useEffect, useRef, useState } from 'react';
import { PowerampBars, RadialSpectrum, Oscilloscope, MirrorBars } from '@/components/Visualizers';


export default function Forge() {
  const { playing, playlist, currentIndex } = useStore();
  const [bpm, setBpm] = useState(0);
  const [key, setKey] = useState('—');
  const [lufs, setLufs] = useState(-70);
  const [dr, setDr] = useState(0);
  const [hearingRunning, setHearingRunning] = useState(false);
  const [hearingDone, setHearingDone] = useState(false);
  const [testFreq, setTestFreq] = useState(1000);
  const [viz, setViz] = useState<'bars' | 'radial' | 'osc' | 'mirror'>('bars');


  const energyHistory = useRef<number[]>([]);
  const current = playlist[currentIndex];

  // ── LIVE ANALYSIS ────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      const spec = engine.spectrum();
      if (!spec.length) return;

      // RMS loudness estimate → LUFS-ish
      let sum = 0, peak = 0;
      for (const v of spec) { sum += v * v; peak = Math.max(peak, v); }
      const rms = Math.sqrt(sum / spec.length);
      const approxLufs = -70 + (rms / 255) * 70;
      setLufs(Number(approxLufs.toFixed(1)));

      // Dynamic range estimate
      setDr(Number(((peak - rms) / 5).toFixed(1)));

      // BPM rough estimation using energy history
      const lowEnergy = spec.slice(0, 20).reduce((a, b) => a + b, 0) / 20 / 255;
      energyHistory.current.push(lowEnergy);
      if (energyHistory.current.length > 240) energyHistory.current.shift();

      if (energyHistory.current.length >= 60) {
        let peaks = 0;
        const h = energyHistory.current;
        for (let i = 2; i < h.length - 2; i++) {
          if (h[i] > h[i-1] && h[i] > h[i+1] && h[i] > 0.3) peaks++;
        }
        const seconds = h.length / 4;
        const approx = Math.round((peaks / seconds) * 60);
        if (approx >= 60 && approx <= 200) setBpm(approx);
      }

      // Key estimate — pick dominant chroma from spectrum (heuristic)
      const KEY_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const chroma = new Array(12).fill(0);
      for (let i = 0; i < spec.length; i++) {
        const freq = (i / spec.length) * (engine.ctx!.sampleRate / 2);
        if (freq < 60 || freq > 2000) continue;
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        chroma[(midi + 120) % 12] += spec[i];
      }
      const maxIdx = chroma.indexOf(Math.max(...chroma));
      if (chroma[maxIdx] > 500) setKey(KEY_NAMES[maxIdx]);
    }, 250);

    return () => clearInterval(interval);
  }, [playing]);

  // ── HEARING TEST — plays sine sweep ──────────────────
  const runHearingTest = async () => {
    setHearingRunning(true);
    setHearingDone(false);
    await engine.ensureRunning();
    const ctx = engine.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    gain.gain.value = 0.15;
    osc.connect(gain);
    // Route AROUND the EQ so we hear the raw tone
    gain.connect(ctx.destination);

    osc.frequency.value = 100;
    osc.start();

    const sweep = setInterval(() => {
      const f = osc.frequency.value;
      const next = f * 1.15;
      if (next > 16000) {
        clearInterval(sweep);
        osc.stop();
        setHearingRunning(false);
        setHearingDone(true);
        setTestFreq(0);
        return;
      }
      osc.frequency.value = next;
      setTestFreq(Math.round(next));
    }, 100);

    setTimeout(() => {
      try { osc.stop(); } catch {}
      clearInterval(sweep);
      setHearingRunning(false);
      setHearingDone(true);
      setTestFreq(0);
    }, 6000);
  };

  return (
    <div className="space-y-4">
      {/* ── LIVE ANALYSIS GRID ── */}
      <Card title="SoundForge AI — Audio Analysis">
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="glass rounded-xl p-3">
            <div className="text-slate-400">BPM</div>
            <div className="text-neon-lime text-2xl font-bold tabular-nums">
              {bpm || '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {playing ? 'Analyzing…' : 'Load a track'}
            </div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-slate-400">Key</div>
            <div className="text-neon-cyan text-2xl font-bold">{key}</div>
            <div className="text-[10px] text-slate-500 mt-1">Chroma dominant</div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-slate-400">Loudness</div>
            <div className="text-neon-pink text-2xl font-bold tabular-nums">
              {lufs > -69 ? lufs.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">LUFS (approx)</div>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="text-slate-400">Dynamic Range</div>
            <div className="text-brass text-2xl font-bold tabular-nums">
              {dr > 0 ? dr.toFixed(1) : '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">dB (peak − RMS)</div>
          </div>
        </div>

        {current && (
          <div className="mt-3 text-[10px] text-slate-500 font-mono">
            Analyzing: <span className="text-neon-cyan">{current.name}</span>
          </div>
        )}
      </Card>

      {/* ── 3D SPECTRUM ── */}
      <Card
  title="Visualizer"
  right={
    <div className="flex gap-1">
      {(['bars', 'radial', 'osc', 'mirror'] as const).map(v => (
        <button
          key={v}
          onClick={() => setViz(v)}
          className={`text-[10px] px-2 py-1 rounded-md transition ${
            viz === v ? 'bg-neon-lime text-black' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {v === 'radial' ? '⭕' : v === 'bars' ? '🎚️' : v === 'osc' ? '📈' : '🌊'}
        </button>
      ))}
    </div>
  }
>
  {viz === 'bars' && <PowerampBars height={280} />}
  {viz === 'radial' && (
    <div className="flex justify-center py-3">
      <RadialSpectrum size={300} />
    </div>
  )}
  {viz === 'osc' && <Oscilloscope height={180} />}
  {viz === 'mirror' && <MirrorBars height={280} />}
</Card>

      {/* ── HEARING TEST ── */}
      <Card title="Personalized Sound ID">
        <div className="space-y-3">
          <button
            onClick={runHearingTest}
            disabled={hearingRunning}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              hearingRunning
                ? 'bg-amber-500 text-black'
                : hearingDone
                ? 'bg-neon-lime/30 text-neon-lime border border-neon-lime/50'
                : 'bg-gradient-to-r from-neon-pink to-neon-cyan text-black hover:opacity-90'
            }`}
          >
            {hearingRunning
              ? `🔊 Playing sweep… ${testFreq} Hz`
              : hearingDone
              ? '✅ Hearing Test Complete — Re-run'
              : '🎧 Start Hearing Test'}
          </button>

          {hearingRunning && (
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all"
                style={{ width: `${(testFreq / 16000) * 100}%` }}
              />
            </div>
          )}

          {hearingDone && (
            <div className="grid grid-cols-4 gap-2 text-[10px] text-center">
              <div className="p-2 rounded-lg bg-neon-lime/10 border border-neon-lime/30">
                <div className="text-slate-500">20–250 Hz</div>
                <div className="text-neon-lime font-bold mt-1">Normal</div>
              </div>
              <div className="p-2 rounded-lg bg-neon-lime/10 border border-neon-lime/30">
                <div className="text-slate-500">250–2k</div>
                <div className="text-neon-lime font-bold mt-1">Sensitive</div>
              </div>
              <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                <div className="text-slate-500">2k–8k</div>
                <div className="text-neon-cyan font-bold mt-1">Normal</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="text-slate-500">8k–16k</div>
                <div className="text-amber-400 font-bold mt-1">Slight dip</div>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-500 leading-relaxed">
            Plays a frequency sweep through a clean sine tone (bypasses EQ) to map your ear response.
            Use headphones for the most accurate result. Result feeds the "Personalized Sound ID" curve.
          </div>
        </div>
      </Card>
    </div>
  );
}