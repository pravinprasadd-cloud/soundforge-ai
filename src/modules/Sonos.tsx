import Card from '@/components/Card';
import { useStore } from '@/store';
import { player } from '@/player';
import { useState } from 'react';

const ROOMS = [
  { id: 'living',  name: 'Living Room', speakers: 2 },
  { id: 'kitchen', name: 'Kitchen',     speakers: 1 },
  { id: 'bedroom', name: 'Bedroom',     speakers: 2 },
  { id: 'study',   name: 'Study',       speakers: 1 },
  { id: 'balcony', name: 'Balcony',     speakers: 1 },
  { id: 'master',  name: 'Master Bed',  speakers: 2 },
];

const AI_MODULES = [
  { id: 'voice',      label: 'Voice Enhance',      icon: '🗣️' },
  { id: 'dialogue',   label: 'Dialogue Boost',     icon: '💬' },
  { id: 'night',      label: 'Night Mode',         icon: '🌙' },
  { id: 'surround',   label: 'Immersive Surround', icon: '🔊' },
  { id: 'spatial',    label: 'Spatial Audio',      icon: '🎧' },
];

const CALIBRATIONS = [
  { id: 'trueplay',  label: 'TruePlay Tuning',    desc: 'Sweep-tone room acoustic analysis' },
  { id: 'loudness',  label: 'Loudness Normalize', desc: 'Match loudness across tracks' },
  { id: 'balance',   label: 'Auto L/R Balance',   desc: 'Detect asymmetry, correct channel gain' },
  { id: 'distance',  label: 'Speaker Distance',   desc: 'Time-align speakers to sweet spot' },
];

export default function Sonos() {
  const { setModule, playing, playlist, currentIndex, setTrackName } = useStore();
  const [active, setActive] = useState('living');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    voice: true, dialogue: true, night: false, surround: true, spatial: false,
  });
  const [calibrating, setCalibrating] = useState<string | null>(null);
  const [calDone, setCalDone] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setEnabled(s => ({ ...s, [id]: !s[id] }));

  const runCalibration = (id: string) => {
    setCalibrating(id);
    setTimeout(() => {
      setCalibrating(null);
      setCalDone(s => ({ ...s, [id]: true }));
    }, 2200);
  };

  const activeRoom = ROOMS.find(r => r.id === active);
  const hasTracks = playlist.length > 0;
  const currentTrack = playlist[currentIndex];

  // ── TRANSPORT ────────────────────────────────────────
  const handlePlay = async () => {
    if (!hasTracks) {
      setModule('dj');
      return;
    }
    // If a track is already loaded, just resume; otherwise load the first
    if (currentIndex >= 0) {
      await player.play();
    } else {
      setTrackName(playlist[0].name);
      await player.loadIndex(0, true);
    }
  };

  const handlePause = () => {
    if (!hasTracks || currentIndex < 0) return;
    player.pause();
  };

  const handlePrev = () => {
    if (!hasTracks) return;
    player.prev();
  };

  const handleNext = () => {
    if (!hasTracks) return;
    player.next();
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* ── ROOM MAP ── */}
      <Card title="Multi-Room Map" className="col-span-2">
        <div className="grid grid-cols-3 gap-3">
          {ROOMS.map(r => {
            const isActive = active === r.id;
            const isPlayingHere = isActive && playing;
            return (
              <button
                key={r.id}
                onClick={() => setActive(r.id)}
                className={`p-4 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'bg-neon-cyan/20 border-neon-cyan/50 shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                    : 'glass border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{r.name}</div>
                  <span className={`w-2 h-2 rounded-full ${isPlayingHere ? 'bg-neon-lime animate-pulse' : isActive ? 'bg-neon-cyan' : 'bg-slate-600'}`} />
                </div>
                <div className="text-xs text-slate-400 mt-1">{r.speakers} speaker{r.speakers > 1 ? 's' : ''}</div>
                {isPlayingHere && <div className="text-[10px] text-neon-lime mt-1">♪ Playing</div>}
                {isActive && !isPlayingHere && <div className="text-[10px] text-neon-cyan mt-1">● Connected</div>}
              </button>
            );
          })}
        </div>

        {/* ── ACTIVE ROOM DETAIL ── */}
        <div className="mt-4 p-4 rounded-xl bg-black/40 border border-neon-cyan/20">
          <div className="text-xs text-slate-400">Now controlling</div>
          <div className="text-base font-semibold text-neon-cyan mt-1">{activeRoom?.name}</div>

          {/* Currently playing track info */}
          {currentTrack && (
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {playing ? '♪' : '❚❚'} {currentTrack.name}
            </div>
          )}

          {/* Transport buttons — REAL controls */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handlePlay}
              className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                playing
                  ? 'bg-neon-cyan/10 text-neon-cyan/60 border-neon-cyan/20 cursor-default'
                  : 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40 hover:bg-neon-cyan/30'
              }`}
              title={hasTracks ? 'Play' : 'No tracks — go to AI DJ'}
            >
              ▶ Play
            </button>
            <button
              onClick={handlePause}
              disabled={!playing}
              className={`px-3 py-1.5 rounded-lg glass text-xs transition ${
                playing ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'
              }`}
              title="Pause"
            >
              ❚❚ Pause
            </button>
            <button
              onClick={handlePrev}
              disabled={!hasTracks || currentIndex <= 0}
              className={`px-3 py-1.5 rounded-lg glass text-xs transition ${
                hasTracks && currentIndex > 0 ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'
              }`}
              title="Previous"
            >
              ⏮
            </button>
            <button
              onClick={handleNext}
              disabled={!hasTracks || currentIndex >= playlist.length - 1}
              className={`px-3 py-1.5 rounded-lg glass text-xs transition ${
                hasTracks && currentIndex < playlist.length - 1 ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'
              }`}
              title="Next"
            >
              ⏭
            </button>
            <button
              onClick={() => setModule('dj')}
              className="ml-auto px-3 py-1.5 rounded-lg bg-neon-lime text-black text-xs font-semibold"
            >
              → Load Music
            </button>
          </div>

          {!hasTracks && (
            <div className="text-[10px] text-amber-400 mt-2">
              ⚠ No tracks loaded. Go to AI DJ → 📂 Add Files first.
            </div>
          )}
        </div>
      </Card>

      {/* ── ACOUSTIC ANALYTICS ── */}
      <Card title="Acoustic Analytics">
        <ul className="text-xs space-y-2 text-slate-400">
          <li>Room size · <span className="text-neon-lime">4.2 × 3.8 m</span></li>
          <li>Reverb time · <span className="text-neon-lime">0.32 s</span></li>
          <li>Reflections · <span className="text-neon-lime">3 detected</span></li>
          <li>Sweet spot · <span className="text-neon-cyan">Calculated</span></li>
          <li>Ceiling height · <span className="text-neon-lime">2.9 m</span></li>
        </ul>

        <div className="mt-4 space-y-2">
          {CALIBRATIONS.map(c => (
            <button
              key={c.id}
              onClick={() => runCalibration(c.id)}
              disabled={calibrating !== null}
              className={`w-full text-left p-2 rounded-lg text-xs transition-all border ${
                calDone[c.id]
                  ? 'bg-neon-lime/10 border-neon-lime/40 text-neon-lime'
                  : calibrating === c.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse'
                  : 'glass border-white/5 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {calDone[c.id] ? '✅ ' : calibrating === c.id ? '⏳ ' : '🎯 '}
                  {c.label}
                </span>
                {calDone[c.id] && <span className="text-[10px]">Done</span>}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{c.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* ── AI MODULES ── */}
      <Card title="AI Modules" className="col-span-3">
        <div className="grid grid-cols-5 gap-2">
          {AI_MODULES.map(m => {
            const on = enabled[m.id];
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`p-3 rounded-xl text-xs transition-all border ${
                  on
                    ? 'bg-neon-cyan/15 border-neon-cyan/50 text-neon-cyan shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                    : 'glass border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="font-medium">{m.label}</div>
                <div className="text-[10px] mt-1">{on ? '● ON' : '○ OFF'}</div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}