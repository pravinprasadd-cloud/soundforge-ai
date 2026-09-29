import Card from '@/components/Card';
import Vinyl from '@/components/Vinyl';
import Tooltip from '@/components/Tooltip';
import { useStore } from '@/store';
import { player } from '@/player';
import { useState } from 'react';
import { shareToWhatsApp } from '@/lib/share';
import {
  PowerampBars,
  RadialSpectrum,
  Oscilloscope,
  MirrorBars,
} from '@/components/Visualizers';

const MOODS = ['Workout', 'Chill', 'Focus', 'Party', 'Late Night'];
const VIZ_LABELS: Record<string, string> = {
  radial: 'Radial — circular spectrum',
  bars:   'Bars — classic Poweramp spectrum',
  osc:    'Oscilloscope — true waveform',
  mirror: 'Mirror — symmetric from center',
};

export default function AIDJ() {
  const {
    playing, playlist, currentIndex,
    setPlaylist, addToPlaylist, removeFromPlaylist, clearPlaylist,
    setTrackName,
  } = useStore();
  const [mood, setMood] = useState('Focus');
  const [loading, setLoading] = useState(false);
  const [viz, setViz] = useState<'radial' | 'bars' | 'osc' | 'mirror'>('radial');

  const current = playlist[currentIndex];

  const loadFiles = async () => {
    setLoading(true);
    try {
      const paths = await (window as any).forge?.openAudio?.();
      if (!paths?.length) return;

      const wasEmpty = useStore.getState().playlist.length === 0;

      const tracks = paths.map((p: string) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: p.split('\\').pop() || p,
        path: p,
      }));
      addToPlaylist(tracks);

      if (wasEmpty) await player.loadIndex(0, false);
    } finally {
      setLoading(false);
    }
  };

  const playIndex = async (i: number) => {
    const track = useStore.getState().playlist[i];
    if (!track) return;
    setTrackName(track.name);
    try {
      await player.loadIndex(i, true);
    } catch (err) {
      console.error('[AIDJ] playIndex failed:', err);
    }
  };

  const exportPlaylist = () => {
    if (!playlist.length) return alert('Playlist is empty.');
    const m3u = ['#EXTM3U', ...playlist.map(t => `#EXTINF:-1,${t.name}\n${t.path}`)].join('\n');
    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Innila-Playlist-${new Date().toISOString().slice(0, 10)}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sharePlaylist = () =>
    shareToWhatsApp('🎵 Innila Playlist', playlist.map((t, i) => `${i + 1}. ${t.name}`));

  const importPlaylist = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.split(/\r?\n/);
      const tracks: any[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#EXTM3U')) continue;
        if (line.startsWith('#EXTINF:')) {
          const path = lines[i + 1]?.trim();
          if (path && !path.startsWith('#')) {
            tracks.push({ id: `${Date.now()}-${i}`, name: path.split('\\').pop() || path, path });
            i++;
          }
        } else if (!line.startsWith('#')) {
          tracks.push({ id: `${Date.now()}-${i}`, name: line.split('\\').pop() || line, path: line });
        }
      }
      if (tracks.length) setPlaylist(tracks);
      else alert('No tracks found in file.');
    };
    reader.readAsText(f);
  };

  return (
    <div className="h-full grid grid-cols-12 gap-3 overflow-hidden">
      <div className="col-span-3 flex flex-col gap-3 min-h-0">
        <Card title="Now Playing" className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
            <Vinyl size={140} />
            <div className="text-center px-2 w-full">
              <div className="text-xs font-semibold truncate text-highlight">
                {current?.name || 'No track loaded'}
              </div>
              <div className="text-[10px] text-muted mt-1">
                {playlist.length > 0
                  ? `Track ${currentIndex + 1} of ${playlist.length}`
                  : 'Load files to begin'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border/40">
            <Tooltip label="Previous track">
              <button
                onClick={() => player.prev()}
                disabled={currentIndex <= 0}
                className="w-9 h-9 rounded-lg glass text-sm disabled:opacity-30"
              >⏮</button>
            </Tooltip>
            <Tooltip label={playing ? 'Pause' : 'Play'}>
              <button
                onClick={() => player.toggle()}
                disabled={!current}
                className="w-12 h-9 rounded-lg bg-highlight text-bg font-bold disabled:opacity-30"
              >{playing ? '❚❚' : '▶'}</button>
            </Tooltip>
            <Tooltip label="Next track">
              <button
                onClick={() => player.next()}
                disabled={currentIndex >= playlist.length - 1}
                className="w-9 h-9 rounded-lg glass text-sm disabled:opacity-30"
              >⏭</button>
            </Tooltip>
          </div>
        </Card>

        <div className="flex gap-2 shrink-0">
          <Tooltip label="Add multiple audio files" className="flex-1">
            <button
              onClick={loadFiles}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-highlight text-bg font-semibold text-xs disabled:opacity-50"
            >{loading ? '⏳' : '📂 Add Files'}</button>
          </Tooltip>
          <Tooltip label="Share to WhatsApp">
            <button
              onClick={sharePlaylist}
              disabled={!playlist.length}
              className="px-3 py-2 rounded-lg bg-green-500 text-white text-xs disabled:opacity-30"
            >📱</button>
          </Tooltip>
        </div>
      </div>

      <div className="col-span-6 flex flex-col gap-3 min-h-0">
        <Card
          title="Visualizer"
          right={
            <div className="flex gap-1">
              {(['radial', 'bars', 'osc', 'mirror'] as const).map(v => (
                <Tooltip key={v} label={VIZ_LABELS[v]}>
                  <button
                    onClick={() => setViz(v)}
                    className={`text-[10px] px-2 py-1 rounded-md transition ${
                      viz === v ? 'bg-highlight text-bg' : 'bg-elevated hover:bg-border'
                    }`}
                  >{v === 'radial' ? '⭕' : v === 'bars' ? '🎚️' : v === 'osc' ? '📈' : '🌊'}</button>
                </Tooltip>
              ))}
            </div>
          }
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 flex items-center justify-center min-h-0">
            {viz === 'radial' && <RadialSpectrum size={220} />}
            {viz === 'bars' && <div className="w-full"><PowerampBars height={180} /></div>}
            {viz === 'osc' && <div className="w-full"><Oscilloscope height={150} /></div>}
            {viz === 'mirror' && <div className="w-full"><MirrorBars height={180} /></div>}
          </div>
        </Card>

        <Card
          title={`Playlist (${playlist.length})`}
          right={
            <div className="flex gap-1">
              <Tooltip label="Import .m3u">
                <label className="text-[10px] px-2 py-1 rounded-lg bg-elevated cursor-pointer hover:bg-border">
                  📥
                  <input type="file" accept=".m3u,.m3u8,.txt" className="hidden" onChange={importPlaylist} />
                </label>
              </Tooltip>
              <Tooltip label="Export .m3u">
                <button onClick={exportPlaylist} className="text-[10px] px-2 py-1 rounded-lg bg-elevated hover:bg-border">💾</button>
              </Tooltip>
              <Tooltip label="Clear playlist">
                <button onClick={clearPlaylist} className="text-[10px] px-2 py-1 rounded-lg bg-danger/30 text-danger hover:bg-danger/50">✕</button>
              </Tooltip>
            </div>
          }
          className="h-[38%] flex flex-col min-h-0"
        >
          {playlist.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted">
              No tracks — click <b className="mx-1 text-highlight">Add Files</b>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-1">
              {playlist.map((t, i) => {
                const isCurrent = i === currentIndex;
                return (
                  <li key={t.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); playIndex(i); }}
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer text-xs transition select-none ${
                        isCurrent
                          ? 'bg-highlight/20 border border-highlight/40'
                          : 'hover:bg-text/5 border border-transparent'
                      }`}
                    >
                      <span className="text-[9px] w-5 text-muted font-mono">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={`flex-1 truncate ${isCurrent ? 'text-highlight' : ''}`}>
                        {t.name}
                      </span>
                      {isCurrent && playing && <span className="text-highlight text-[10px]">▶</span>}
                      {isCurrent && !playing && <span className="text-muted text-[10px]">❚❚</span>}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromPlaylist(t.id); }}
                        className="text-danger text-[10px] px-1 hover:text-red-300"
                      >✕</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="col-span-3 flex flex-col gap-3 min-h-0">
        <Card title="Mood Engine">
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition ${
                  mood === m ? 'bg-accent2 text-white' : 'glass text-muted hover:bg-text/5'
                }`}
              >{m}</button>
            ))}
          </div>
        </Card>

        <Card title="Track Intelligence" className="flex-1 min-h-0">
          <ul className="text-[11px] space-y-2 text-muted font-mono">
            <li className="flex justify-between"><span>BPM</span><span className="text-highlight">→ Forge AI</span></li>
            <li className="flex justify-between"><span>Key</span><span className="text-accent">→ Forge AI</span></li>
            <li className="flex justify-between"><span>Energy</span><span className="text-accent2">→ Forge AI</span></li>
            <li className="flex justify-between"><span>Mood</span><span className="text-accent">{mood}</span></li>
            <li className="flex justify-between"><span>Loudness</span><span className="text-highlight">→ Forge AI</span></li>
            <li className="flex justify-between"><span>DR</span><span className="text-accent">→ Forge AI</span></li>
          </ul>
          <div className="mt-3 pt-3 border-t border-border/40 text-[10px] text-muted">
            Switch to the <span className="text-highlight">⚡ Forge AI</span> tab for live analysis.
          </div>
        </Card>

        <Card title="DJ Voice">
          <div className="text-[10px] text-muted leading-relaxed">
            🎙️ <i>"Next up — keeping the {mood.toLowerCase()} vibe going…"</i>
          </div>
        </Card>
      </div>
    </div>
  );
}