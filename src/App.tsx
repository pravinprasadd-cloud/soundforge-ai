import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { player } from '@/player';
import AIDJ from '@/modules/AIDJ';
import Video from '@/modules/Video';
import BoseEQ from '@/modules/BoseEQ';
import Marshall from '@/modules/Marshall';
import Sonos from '@/modules/Sonos';
import Forge from '@/modules/Forge';
import Grabber from '@/modules/Grabber';
import Ringtones from '@/modules/Ringtones';
import Settings from '@/modules/Settings';

const TABS = [
  { id: 'dj',       label: 'AI DJ',      icon: '🎧' },
  { id: 'video',    label: 'Video',      icon: '🎬' },   // ← NEW
  { id: 'grabber',  label: 'Grabber',    icon: '⬇️' },
  { id: 'bose',     label: 'Bose EQ',    icon: '🔊' },
  { id: 'marshall', label: 'Marshall',   icon: '🎸' },
  { id: 'sonos',    label: 'Sonos',      icon: '📡' },
  { id: 'forge',    label: 'Forge AI',   icon: '⚡' },
  { id: 'ringtone', label: 'Ringtones',  icon: '🔔' },
  { id: 'settings', label: 'Settings',   icon: '⚙️' },
];

export default function App() {
  const { module, setModule, theme } = useStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) player.attach(audioRef.current);
  }, []);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme !== 'paper');
  }, [theme]);

  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      <audio ref={audioRef} crossOrigin="anonymous" style={{ display: 'none' }} />

      {/* TITLE BAR */}
      <div className="h-9 titlebar-drag flex items-center justify-between px-4 bg-surface border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-accent2 font-bold text-sm">♥ Innila</span>
          <span className="text-[10px] text-muted">v1.0</span>
        </div>
        <div className="titlebar-nodrag flex items-center gap-2 text-[10px] text-muted">
          <span>Built for the family · Bengaluru</span>
        </div>
      </div>

      {/* TAB BAR */}
      <nav className="flex gap-1 px-4 py-3 bg-surface/70 border-b border-border/50 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setModule(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              module === t.id
                ? 'bg-highlight text-bg'
                : 'text-muted hover:bg-text/5'
            }`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* MODULE VIEW */}
      <main className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-auto no-scrollbar">
          {module === 'dj'       && <AIDJ />}
          {module === 'video' && <Video />}
          {module === 'bose'     && <BoseEQ />}
          {module === 'marshall' && <Marshall />}
          {module === 'sonos'    && <Sonos />}
          {module === 'forge'    && <Forge />}
          {module === 'grabber'  && <Grabber />}
          {module === 'ringtone' && <Ringtones />}
          {module === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}