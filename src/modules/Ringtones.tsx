import Card from '@/components/Card';
import WaveformEditor from '@/components/WaveformEditor';
import { useEffect, useRef, useState } from 'react';
import { audioBufferToWav, decodeAudioFile, sliceBuffer } from '@/audio/encoder';

interface LoadedFile {
  path: string;
  name: string;
  buffer: AudioBuffer;
}

const PRESETS = [
  { label: '5s',  value: 5  },
  { label: '10s', value: 10 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '40s', value: 40 },
];

export default function Ringtones() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(30);
  const [loading, setLoading] = useState(false);
  const [looping, setLooping] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [fadeIn, setFadeIn] = useState(0);   // seconds
  const [fadeOut, setFadeOut] = useState(0); // seconds
  const [volume, setVolume] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // ── Load file ────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const paths = await (window as any).forge?.openAudio?.();
      if (!paths?.length) return;
      const path = paths[0];
      const buf = await decodeAudioFile(path, (window as any).forge.readFile);
      setFile({ path, name: path.split('\\').pop(), buffer: buf });
      setStart(0);
      setEnd(Math.min(30, buf.duration));
      setPlayhead(0);
    } catch (err) {
      alert('Could not load: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── Preview (loop the selection) ─────────────────────
  const buildPreviewUrl = () => {
    if (!file) return null;
    const sliced = sliceBuffer(file.buffer, start, end);
    // apply fade in/out to the sliced buffer
    const sr = sliced.sampleRate;
    const inSamples = Math.floor(fadeIn * sr);
    const outSamples = Math.floor(fadeOut * sr);
    for (let c = 0; c < sliced.numberOfChannels; c++) {
      const ch = sliced.getChannelData(c);
      for (let i = 0; i < inSamples && i < ch.length; i++) ch[i] *= i / inSamples;
      for (let i = 0; i < outSamples && i < ch.length; i++) ch[ch.length - 1 - i] *= i / outSamples;
    }
    const wav = audioBufferToWav(sliced);
    return URL.createObjectURL(wav);
  };

  const togglePreview = () => {
    const el = audioRef.current;
    if (!el || !file) return;

    if (looping) {
      el.pause();
      el.currentTime = 0;
      setLooping(false);
      setPlayhead(0);
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const url = buildPreviewUrl();
    if (!url) return;
    el.src = url;
    el.loop = true;
    el.volume = volume;
    el.play().then(() => {
      setLooping(true);
      const tick = () => {
        if (!audioRef.current) return;
        setPlayhead(start + audioRef.current.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ── Set selection via preset ─────────────────────────
  const applyPreset = (sec: number) => {
    if (!file) return;
    setEnd(Math.min(start + sec, file.buffer.duration));
  };

  // ── Export ───────────────────────────────────────────
  const exportFile = (format: 'wav' | 'm4r' | 'mp3') => {
    if (!file) return;
    const sliced = sliceBuffer(file.buffer, start, end);
    const sr = sliced.sampleRate;
    const inSamples = Math.floor(fadeIn * sr);
    const outSamples = Math.floor(fadeOut * sr);
    for (let c = 0; c < sliced.numberOfChannels; c++) {
      const ch = sliced.getChannelData(c);
      for (let i = 0; i < inSamples && i < ch.length; i++) ch[i] *= i / inSamples;
      for (let i = 0; i < outSamples && i < ch.length; i++) ch[ch.length - 1 - i] *= i / outSamples;
    }
    const wav = audioBufferToWav(sliced);
    const base = file.name.replace(/\.[^.]+$/, '');
    const ext = format === 'm4r' ? 'm4r' : format === 'mp3' ? 'mp3' : 'wav';
    const note = format === 'mp3'
      ? '\n\n⚠ MP3 encoding is not supported in-browser. The file will be saved as WAV — rename it to .mp3 or use a converter.'
      : format === 'm4r'
      ? '\n\nℹ M4R is the iPhone ringtone format. Rename the file and drag into iTunes/Finder to install.'
      : '';

    const a = document.createElement('a');
    a.href = URL.createObjectURL(wav);
    a.download = `${base}-ringtone-${Math.round(end - start)}s.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);

    if (note) alert(`Exported as .${ext}${note}`);
  };

  const duration = file ? file.buffer.duration : 0;
  const selection = end - start;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2).padStart(5, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="space-y-4">
      <Card title="Ringtone Cutter">
        {/* Load / file info */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-neon-lime text-black font-semibold text-sm disabled:opacity-50"
          >
            {loading ? '⏳ Loading…' : '📂 Load MP3 / WAV'}
          </button>
          {file && (
            <div className="flex-1 truncate text-xs text-slate-400">
              <span className="text-neon-cyan">{file.name}</span>
              {' · '}
              <span>{fmt(duration)} total</span>
            </div>
          )}
        </div>

        {/* Waveform editor */}
        <WaveformEditor
          audioBuffer={file?.buffer || null}
          start={start}
          end={end}
          playhead={looping ? playhead : 0}
          onChangeStart={setStart}
          onChangeEnd={setEnd}
        />

        {/* Selection readout */}
        {file && (
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
            <div className="glass rounded-lg p-2">
              <div className="text-slate-500">Start</div>
              <div className="text-neon-cyan font-mono">{fmt(start)}</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-slate-500">End</div>
              <div className="text-neon-cyan font-mono">{fmt(end)}</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-slate-500">Length</div>
              <div className="text-neon-lime font-mono">{selection.toFixed(2)} s</div>
            </div>
            <div className="glass rounded-lg p-2">
              <div className="text-slate-500">Time range</div>
              <div className="text-neon-pink font-mono">{fmt(start)} → {fmt(end)}</div>
            </div>
          </div>
        )}
      </Card>

      {file && (
        <div className="grid grid-cols-2 gap-4">
          {/* Selection presets */}
          <Card title="Duration Presets">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => applyPreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition ${
                    Math.abs(selection - p.value) < 0.05
                      ? 'bg-neon-lime text-black font-semibold'
                      : 'glass hover:bg-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fade In</span>
                  <span className="text-neon-cyan font-mono">{fadeIn.toFixed(2)} s</span>
                </div>
                <input
                  type="range" min={0} max={3} step={0.05}
                  value={fadeIn}
                  onChange={e => setFadeIn(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fade Out</span>
                  <span className="text-neon-cyan font-mono">{fadeOut.toFixed(2)} s</span>
                </div>
                <input
                  type="range" min={0} max={3} step={0.05}
                  value={fadeOut}
                  onChange={e => setFadeOut(Number(e.target.value))}
                  className="w-full accent-neon-cyan"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Preview Volume</span>
                  <span className="text-neon-cyan font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01}
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-full accent-neon-lime"
                />
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card title="Preview & Export">
            <button
              onClick={togglePreview}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                looping
                  ? 'bg-neon-pink text-white'
                  : 'bg-gradient-to-r from-neon-pink to-neon-cyan text-black'
              }`}
            >
              {looping ? '❚❚ Stop Loop' : '▶ Preview Loop'}
            </button>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => exportFile('wav')}
                className="py-2 rounded-lg glass text-xs hover:bg-white/10"
              >
                💾 WAV
              </button>
              <button
                onClick={() => exportFile('mp3')}
                className="py-2 rounded-lg glass text-xs hover:bg-white/10"
              >
                💾 MP3
              </button>
              <button
                onClick={() => exportFile('m4r')}
                className="py-2 rounded-lg glass text-xs hover:bg-white/10"
              >
                💾 M4R
              </button>
            </div>

            <div className="mt-4 text-[10px] text-slate-500 leading-relaxed">
              <div className="font-semibold text-slate-400 mb-1">📱 After export:</div>
              <div><b>Android:</b> Copy the .wav to <code className="text-neon-cyan">/sdcard/Ringtones/</code>. Settings → Sound → Phone ringtone</div>
              <div className="mt-1"><b>iPhone:</b> Rename to <code className="text-neon-cyan">.m4r</code>, drag into Finder/iTunes → Sync → Set as Ringtone</div>
              <div className="mt-1"><b>WhatsApp/Other:</b> The .wav works directly</div>
            </div>
          </Card>
        </div>
      )}

      {/* Hidden audio element for preview */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}