import Card from '@/components/Card';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';

type Mode = 'audio' | 'video';

interface HistoryItem {
  url: string;
  type: Mode;
  path: string;
  name: string;
  at: number;
}

export default function Grabber() {
  const { playlist, addToPlaylist } = useStore();
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<Mode>('audio');
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Subscribe to progress + status events from main
  useEffect(() => {
    const offProgress = (window as any).forge?.onMediaProgress?.((d: any) => {
      setPercent(Math.round(d.percent));
    });
    const offStatus = (window as any).forge?.onMediaStatus?.((d: any) => {
      setStatus(d.line);
    });
    return () => { offProgress?.(); offStatus?.(); };
  }, []);

  const detectSource = (u: string) => {
    if (/youtu\.?be/i.test(u)) return 'YouTube';
    if (/instagram\.com/i.test(u)) return 'Instagram';
    if (/tiktok\.com/i.test(u)) return 'TikTok';
    if (/twitter\.com|x\.com/i.test(u)) return 'X (Twitter)';
    if (/facebook\.com/i.test(u)) return 'Facebook';
    return 'Unknown source';
  };

  const start = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setError('');
    setStatus('');
    setPercent(0);

    try {
      const res = await (window as any).forge?.downloadMedia?.({
        url: url.trim(),
        type: mode,
      });

      if (!res?.ok) {
        setError(res?.error || 'Download failed');
        setBusy(false);
        return;
      }

      const name = res.path.split('\\').pop() || res.path;
      const item: HistoryItem = {
        url: url.trim(),
        type: mode,
        path: res.path,
        name,
        at: Date.now(),
      };
      setHistory((h) => [item, ...h].slice(0, 20));

      // If audio, offer to add to playlist
      if (mode === 'audio') {
        // Auto-add to playlist — user can remove
        addToPlaylist([{
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name,
          path: res.path,
        }]);
        setStatus(`✅ Downloaded ${name} — added to AI DJ playlist`);
      } else {
        setStatus(`✅ Downloaded ${name}`);
      }

      setUrl('');
      setPercent(100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openFolder = () => (window as any).forge?.openDownloadFolder?.();

  const source = url ? detectSource(url) : '';

  return (
    <div className="space-y-4">
      <Card title="Media Grabber — YouTube / Instagram / TikTok / X">
        <div className="space-y-4">
          {/* URL input */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Paste any video URL
            </label>
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && start()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 rounded-lg bg-ink-700 text-sm outline-none border border-white/5 focus:border-neon-lime/50"
                disabled={busy}
              />
              {source && (
                <span className="px-3 py-2 rounded-lg glass text-xs text-neon-cyan whitespace-nowrap">
                  {source}
                </span>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('audio')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'audio'
                  ? 'bg-neon-lime text-black'
                  : 'glass text-slate-300 hover:bg-white/5'
              }`}
            >
              🎵 MP3 Audio
            </button>
            <button
              onClick={() => setMode('video')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                mode === 'video'
                  ? 'bg-neon-lime text-black'
                  : 'glass text-slate-300 hover:bg-white/5'
              }`}
            >
              🎬 MP4 Video
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={start}
            disabled={busy || !url.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-pink to-neon-cyan text-black font-bold disabled:opacity-40"
          >
            {busy ? `⏳ Downloading… ${percent}%` : '⬇️ Download'}
          </button>

          {/* Progress bar */}
          {busy && (
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}

          {/* Status line */}
          {status && !error && (
            <div className="text-xs text-neon-lime font-mono truncate">{status}</div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 font-mono whitespace-pre-wrap p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              ⚠ {error}
            </div>
          )}

          {/* Save location */}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>
              Files save to: <code className="text-neon-cyan">~/Downloads/SoundForge/</code>
            </span>
            <button onClick={openFolder} className="text-neon-cyan hover:underline">
              📁 Open folder
            </button>
          </div>

          {/* Audio mode hint */}
          {mode === 'audio' && (
            <div className="text-[10px] text-slate-500 leading-relaxed">
              💡 Audio downloads are automatically added to the <b>AI DJ playlist</b>.
              Switch to the 🎧 AI DJ tab to play them.
            </div>
          )}
        </div>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card
          title={`Recent Downloads (${history.length})`}
          right={
            <button
              onClick={() => setHistory([])}
              className="text-[10px] px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600"
            >
              Clear
            </button>
          }
        >
          <ul className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-ink-700 text-xs"
              >
                <span>{h.type === 'audio' ? '🎵' : '🎬'}</span>
                <span className="flex-1 truncate">{h.name}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(h.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Supported platforms */}
      <Card title="Supported Platforms">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="glass rounded-lg p-3">
            <div className="text-2xl mb-1">▶️</div>
            <div className="font-medium">YouTube</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-2xl mb-1">📷</div>
            <div className="font-medium">Instagram</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-2xl mb-1">🎵</div>
            <div className="font-medium">TikTok</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-2xl mb-1">🐦</div>
            <div className="font-medium">X / Twitter</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-slate-500">
          Powered by yt-dlp — supports 1800+ sites. Rate limits may apply on Instagram.
        </div>
      </Card>
    </div>
  );
}