import Card from '@/components/Card';
import Tooltip from '@/components/Tooltip';
import { useStore } from '@/store';
import { useEffect, useRef, useState } from 'react';

export default function Video() {
  const { videoHistory, addVideoHistory, clearVideoHistory } = useStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // ─── State ─────────────────────────────────────────────
  const [current, setCurrent] = useState<{ name: string; path: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [videoInfo, setVideoInfo] = useState<{
    width: number;
    height: number;
    duration: number;
    size: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Scrub state ───────────────────────────────────────
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [skipToast, setSkipToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const seekTargetRef = useRef<number | null>(null);
  const seekTimeoutRef = useRef<number | null>(null);

  // ═════════════════════════════════════════════════════════
  // ACCURATE SEEK — wait for 'seeked' event, fallback if slow
  // ═════════════════════════════════════════════════════════
  const accurateSeek = (target: number, onDone?: () => void) => {
    const v = videoRef.current;
    if (!v) return;

    seekTargetRef.current = target;

    // Clear any prior fallback timer
    if (seekTimeoutRef.current) {
      window.clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    const onSeeked = () => {
      v.removeEventListener('seeked', onSeeked);
      if (seekTimeoutRef.current) {
        window.clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }

      // ⚠️ Verify actual landing position — MKV sparse keyframes
      const landed = v.currentTime;
      const drift = Math.abs(landed - target);

      if (drift > 1.5) {
        // Chromium landed on a keyframe far from target.
        // Do a second micro-seek to nudge forward.
        console.log(`[Video] seek drift ${drift.toFixed(2)}s — nudging to ${target}`);
        v.currentTime = target;
        // wait one more seeked event
        v.addEventListener('seeked', () => {
          setCurrentTime(v.currentTime);
          onDone?.();
        }, { once: true });
      } else {
        setCurrentTime(v.currentTime);
        onDone?.();
      }
    };

    v.addEventListener('seeked', onSeeked, { once: true });

    // Apply the seek (fastSeek = false ensures accurate seek)
    try {
      (v as any).fastSeek = false;
      v.currentTime = target;
    } catch (e) {
      console.warn('[Video] seek failed:', e);
    }

    // Fallback — if 'seeked' doesn't fire in 2s, force-sync state
    seekTimeoutRef.current = window.setTimeout(() => {
      v.removeEventListener('seeked', onSeeked);
      console.log('[Video] seek timeout — force-syncing');
      setCurrentTime(v.currentTime);
      onDone?.();
    }, 2000);
  };

  // ═════════════════════════════════════════════════════════
  // POLLING — keeps UI synced even when events don't fire
  // ═════════════════════════════════════════════════════════
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      if (!scrubbing) setCurrentTime(v.currentTime || 0);

      if (v.duration && isFinite(v.duration) && v.duration !== duration) {
        setDuration(v.duration);
      }

      if (v.videoWidth && videoInfo?.width !== v.videoWidth) {
        setVideoInfo((prev) => ({
          width: v.videoWidth,
          height: v.videoHeight,
          duration: v.duration || 0,
          size: prev?.size || '—',
        }));
      }
    }, 200);
    return () => clearInterval(id);
  }, [scrubbing, duration, videoInfo]);

  // ─── Load video ────────────────────────────────────────
  const loadFile = async (filePath?: string, fileName?: string) => {
    let p = filePath;
    let n = fileName;

    if (!p) {
      const paths = await (window as any).forge?.openAudio?.();
      if (!paths?.length) return;
      p = paths[0];
      n = p!.split('\\').pop();
    }
    if (!p) return;

    const fname = n || p.split('\\').pop() || 'video';

    try {
      setError(null);
      const info = await (window as any).forge?.videoInfo?.(p);
      if (!info?.ok) throw new Error(info?.error || 'cannot read file');

      const v = videoRef.current;
      if (!v) return;

      v.src = info.mediaUrl;
      v.load();

      // Wait for metadata before playing
      await new Promise<void>((resolve) => {
        const onMeta = () => {
          v.removeEventListener('loadedmetadata', onMeta);
          resolve();
        };
        v.addEventListener('loadedmetadata', onMeta);
        setTimeout(resolve, 3000); // safety timeout
      });

      try { await v.play(); } catch {}
      setPlaying(true);
      setCurrentTime(0);
      setDuration(v.duration || 0);

      setCurrent({ name: fname, path: p });
      setVideoInfo({
        width: v.videoWidth,
        height: v.videoHeight,
        duration: v.duration || 0,
        size: info.sizeFormatted,
      });

      addVideoHistory({
        id: `${Date.now()}`,
        name: fname,
        path: p,
        lastUsed: Date.now(),
        lastPlayed: Date.now(),
      } as any);
    } catch (err) {
      alert('Could not load video: ' + (err as Error).message);
    }
  };

  // ─── Toast ─────────────────────────────────────────────
  const showToast = (msg: string) => {
    setSkipToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSkipToast(null), 700);
  };

  // ─── Seek via buttons ──────────────────────────────────
  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!d || !isFinite(d)) return;
    const target = Math.max(0, Math.min(d, v.currentTime + delta));
    accurateSeek(target);
    showToast(delta > 0 ? `⏩ +${delta}s` : `⏪ ${delta}s`);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    const d = v.duration;
    if (!d || !isFinite(d)) return;
    const clamped = Math.max(0, Math.min(d, t));
    accurateSeek(clamped);
  };

  // ─── Transport ─────────────────────────────────────────
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const setPlaybackSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const setVolumePct = (p: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = p;
    setVolume(p);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const doc: any = document;
      if (doc.pictureInPictureElement) {
        await doc.exitPictureInPicture();
        setIsPip(false);
      } else if (doc.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
        setIsPip(true);
      } else {
        alert('Picture-in-Picture is not available.');
      }
    } catch {}
  };

  // ═════════════════════════════════════════════════════════
  // SCRUB — drag uses accurate seek on release only
  // ═════════════════════════════════════════════════════════
  const posToTime = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * (duration || 0);
  };

  const onBarDown = (e: React.MouseEvent) => {
    if (!duration) return;
    e.preventDefault();

    const v = videoRef.current;
    wasPlayingRef.current = v ? !v.paused : false;
    if (wasPlayingRef.current) v?.pause();

    setScrubbing(true);
    setScrubTime(posToTime(e.clientX));
  };

  // Drag: move = visual only. Release = accurate seek + resume.
  useEffect(() => {
    if (!scrubbing) return;

    const move = (e: MouseEvent) => setScrubTime(posToTime(e.clientX));

    const up = (e: MouseEvent) => {
      const t = posToTime(e.clientX);
      setScrubbing(false);
      setScrubTime(t);

      const v = videoRef.current;
      if (!v) return;

      const shouldResume = wasPlayingRef.current;
      wasPlayingRef.current = false;

      accurateSeek(t, () => {
        if (shouldResume) v.play().catch(() => {});
      });
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    // eslint-disable-next-line
  }, [scrubbing, duration]);

  const onBarClick = (e: React.MouseEvent) => {
    if (!duration) return;
    const lastScrub = (window as any).__innilaLastScrub || 0;
    if (Date.now() - lastScrub < 300) return;
    seekTo(posToTime(e.clientX));
  };

  // ─── Fullscreen / PiP listeners ────────────────────────
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    const v = videoRef.current;
    const onEnterPip = () => setIsPip(true);
    const onLeavePip = () => setIsPip(false);
    document.addEventListener('fullscreenchange', onFs);
    v?.addEventListener('enterpictureinpicture', onEnterPip);
    v?.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      v?.removeEventListener('enterpictureinpicture', onEnterPip);
      v?.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  // ─── Keyboard ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!videoRef.current) return;

      const key = e.key.toLowerCase();

      if (/^[0-9]$/.test(key)) {
        const pct = parseInt(key, 10) / 10;
        seekTo(pct * (duration || 0));
        showToast(`Jump → ${Math.round(pct * 100)}%`);
        return;
      }

      switch (key) {
        case ' ':
        case 'k':
          e.preventDefault();
          toggle();
          break;
        case 'j': seekBy(-10); break;
        case 'l': seekBy(10); break;
        case 'arrowleft':
          e.preventDefault();
          seekBy(e.shiftKey ? -30 : -5);
          break;
        case 'arrowright':
          e.preventDefault();
          seekBy(e.shiftKey ? 30 : 5);
          break;
        case 'arrowup': e.preventDefault(); setVolumePct(Math.min(1, volume + 0.1)); break;
        case 'arrowdown': e.preventDefault(); setVolumePct(Math.max(0, volume - 0.1)); break;
        case 'f': toggleFullscreen(); break;
        case 'p': togglePip(); break;
        case 'm': toggleMute(); break;
        case ',': setPlaybackSpeed(Math.max(0.25, +(speed - 0.25).toFixed(2))); break;
        case '.': setPlaybackSpeed(Math.min(2, +(speed + 0.25).toFixed(2))); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line
  }, [volume, speed, duration]);

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const displayTime = scrubbing ? scrubTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;
  const hoverPct = duration > 0 && hoverTime !== null ? (hoverTime / duration) * 100 : 0;

  return (
    <div className="h-full grid grid-cols-12 gap-3 overflow-hidden">
      <div className="col-span-8 flex flex-col gap-3 min-h-0">
        <Card
          title={current ? current.name : 'Video Player'}
          className="flex-1 flex flex-col min-h-0"
        >
          <div
            ref={containerRef}
            className={`flex-1 flex items-center justify-center min-h-0 bg-black rounded-xl overflow-hidden relative ${
              dragOver ? 'ring-2 ring-highlight' : ''
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) {
                const p = (f as any).path;
                if (p) loadFile(p, f.name);
              }
            }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              preload="auto"
              onLoadedMetadata={() => {
                const v = videoRef.current!;
                if (v.duration && isFinite(v.duration)) setDuration(v.duration);
                setVideoInfo((prev) => ({
                  width: v.videoWidth,
                  height: v.videoHeight,
                  duration: v.duration || 0,
                  size: prev?.size || '—',
                }));
              }}
              onDurationChange={() => {
                const v = videoRef.current!;
                if (v.duration && isFinite(v.duration)) setDuration(v.duration);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={(e) => {
                const err = (e.target as HTMLVideoElement).error;
                if (err?.code === 4) {
                  setError('Codec not supported (HEVC/AC3). Convert with ffmpeg.');
                }
              }}
            />

            {!current && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted gap-3 pointer-events-none">
                <div className="text-5xl opacity-30">🎬</div>
                <div className="text-sm">Drop a video here or click Open</div>
              </div>
            )}

            {error && (
              <div className="absolute bottom-4 left-4 right-4 px-3 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger text-xs">
                ⚠ {error}
              </div>
            )}

            {skipToast && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/80 text-highlight text-sm font-mono pointer-events-none">
                {skipToast}
              </div>
            )}
          </div>

          {/* SCRUB BAR */}
          <div
            ref={barRef}
            className="mt-3 pt-3 pb-3 relative cursor-pointer select-none group"
            onMouseDown={onBarDown}
            onMouseMove={(e) => {
              const bar = barRef.current;
              if (!bar) return;
              const rect = bar.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverTime(pct * (duration || 0));
            }}
            onMouseUp={() => { (window as any).__innilaLastScrub = Date.now(); }}
            onMouseLeave={() => setHoverTime(null)}
            onClick={onBarClick}
          >
            <div className="h-2 rounded-full bg-elevated overflow-hidden">
              <div className="h-full bg-highlight" style={{ width: `${progress}%` }} />
            </div>

            {hoverTime !== null && !scrubbing && duration > 0 && (
              <div
                className="absolute top-3 h-2 w-0.5 bg-white/60 pointer-events-none"
                style={{ left: `${hoverPct}%` }}
              />
            )}

            <div
              className={`absolute top-3 w-4 h-4 rounded-full bg-highlight shadow-lg pointer-events-none transition-transform ${
                scrubbing ? 'scale-125' : 'group-hover:scale-110'
              }`}
              style={{ left: `${progress}%`, transform: 'translate(-50%, -25%)' }}
            />

            {(hoverTime !== null || scrubbing) && duration > 0 && (
              <div
                className="absolute top-0 px-2 py-0.5 rounded-md bg-black/90 text-highlight text-[11px] font-mono whitespace-nowrap pointer-events-none -translate-x-1/2 -translate-y-2"
                style={{ left: `${scrubbing ? progress : hoverPct}%` }}
              >
                {fmt(scrubbing ? scrubTime : hoverTime ?? 0)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted font-mono -mt-1">
            <span>{fmt(displayTime)}</span>
            <span>−{fmt(Math.max(0, duration - displayTime))}</span>
            <span>{fmt(duration)}</span>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Tooltip label="Open video file">
              <button onClick={() => loadFile()} className="px-3 py-1.5 rounded-lg bg-highlight text-bg text-xs font-semibold">
                📂 Open
              </button>
            </Tooltip>

            <div className="flex items-center gap-1">
              <Tooltip label="Back 30s (Shift+←)">
                <button onClick={() => seekBy(-30)} className="w-9 h-8 rounded-lg glass text-[10px]">⏪30</button>
              </Tooltip>
              <Tooltip label="Back 10s (J)">
                <button onClick={() => seekBy(-10)} className="w-8 h-8 rounded-lg glass text-xs">⏪</button>
              </Tooltip>
              <Tooltip label="Back 5s (←)">
                <button onClick={() => seekBy(-5)} className="w-7 h-8 rounded-lg glass text-[10px]">◄</button>
              </Tooltip>
              <Tooltip label={playing ? 'Pause (Space)' : 'Play (Space)'}>
                <button onClick={toggle} className="w-11 h-8 rounded-lg bg-highlight text-bg font-bold">
                  {playing ? '❚❚' : '▶'}
                </button>
              </Tooltip>
              <Tooltip label="Forward 5s (→)">
                <button onClick={() => seekBy(5)} className="w-7 h-8 rounded-lg glass text-[10px]">►</button>
              </Tooltip>
              <Tooltip label="Forward 10s (L)">
                <button onClick={() => seekBy(10)} className="w-8 h-8 rounded-lg glass text-xs">⏩</button>
              </Tooltip>
              <Tooltip label="Forward 30s (Shift+→)">
                <button onClick={() => seekBy(30)} className="w-9 h-8 rounded-lg glass text-[10px]">30⏩</button>
              </Tooltip>
            </div>

            <Tooltip label={`Speed: ${speed}×`}>
              <select
                value={speed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="px-2 py-1 rounded-lg bg-elevated text-xs border border-border/40 outline-none"
              >
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <option key={s} value={s}>{s}×</option>
                ))}
              </select>
            </Tooltip>

            <Tooltip label={muted ? 'Unmute (M)' : 'Mute (M)'}>
              <button onClick={toggleMute} className="w-8 h-8 rounded-lg glass text-xs">
                {muted ? '🔇' : '🔊'}
              </button>
            </Tooltip>
            <input
              type="range" min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => { setVolumePct(parseFloat(e.target.value)); if (muted) toggleMute(); }}
              className="w-20 accent-highlight"
            />

            <div className="ml-auto flex gap-1">
              <Tooltip label={isPip ? 'Exit PiP (P)' : 'Picture-in-Picture (P)'}>
                <button
                  onClick={togglePip}
                  className={`w-8 h-8 rounded-lg text-xs ${isPip ? 'bg-highlight text-bg' : 'glass'}`}
                >◱</button>
              </Tooltip>
              <Tooltip label={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}>
                <button
                  onClick={toggleFullscreen}
                  className={`w-8 h-8 rounded-lg text-xs ${isFullscreen ? 'bg-highlight text-bg' : 'glass'}`}
                >{isFullscreen ? '⤡' : '⛶'}</button>
              </Tooltip>
            </div>
          </div>
        </Card>
      </div>

      {/* RIGHT PANEL */}
      <div className="col-span-4 flex flex-col gap-3 min-h-0">
        <Card title="Video Info" className="shrink-0">
          {videoInfo ? (
            <ul className="text-[11px] space-y-2 font-mono text-muted">
              <li className="flex justify-between">
                <span>Resolution</span>
                <span className="text-highlight">
                  {videoInfo.width > 0 ? `${videoInfo.width} × ${videoInfo.height}` : '—'}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Duration</span>
                <span className="text-accent">{duration > 0 ? fmt(duration) : '—'}</span>
              </li>
              <li className="flex justify-between">
                <span>File size</span>
                <span className="text-accent2">{videoInfo.size}</span>
              </li>
              <li className="flex justify-between">
                <span>Speed</span>
                <span className="text-highlight">{speed}×</span>
              </li>
            </ul>
          ) : (
            <div className="text-xs text-muted text-center py-4">Load a video to see properties</div>
          )}
        </Card>

        <Card title="Navigation Cheat Sheet" className="shrink-0">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted font-mono">
            <div className="flex justify-between"><span>±5s</span><span className="text-highlight">← →</span></div>
            <div className="flex justify-between"><span>±30s</span><span className="text-highlight">⇧ + ← →</span></div>
            <div className="flex justify-between"><span>±10s</span><span className="text-highlight">J / L</span></div>
            <div className="flex justify-between"><span>Jump 0–90%</span><span className="text-highlight">0…9</span></div>
            <div className="flex justify-between"><span>Volume</span><span className="text-highlight">↑ ↓</span></div>
            <div className="flex justify-between"><span>Speed ±0.25</span><span className="text-highlight">, .</span></div>
            <div className="flex justify-between"><span>Play / Pause</span><span className="text-highlight">Space / K</span></div>
            <div className="flex justify-between"><span>Fullscreen</span><span className="text-highlight">F</span></div>
            <div className="flex justify-between"><span>PiP</span><span className="text-highlight">P</span></div>
            <div className="flex justify-between"><span>Mute</span><span className="text-highlight">M</span></div>
          </div>
        </Card>

        <Card title="From Grabber" className="shrink-0">
          <button
            onClick={() => (window as any).forge?.openDownloadFolder?.()}
            className="w-full py-2 rounded-lg bg-accent/20 text-accent border border-accent/40 text-xs"
          >📁 Open Downloads folder</button>
        </Card>

        <Card
          title={`Recently Played (${videoHistory.length})`}
          right={videoHistory.length > 0 && (
            <button
              onClick={clearVideoHistory}
              className="text-[10px] px-2 py-1 rounded-lg bg-danger/20 text-danger"
            >✕</button>
          )}
          className="flex-1 flex flex-col min-h-0"
        >
          {videoHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-muted text-center px-3">
              Videos you open will be remembered here
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto no-scrollbar space-y-1">
              {videoHistory.map((v) => (
                <li
                  key={v.id}
                  onClick={() => loadFile(v.path, v.name)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition hover:bg-text/5 ${
                    current?.path === v.path ? 'bg-highlight/20 border border-highlight/40' : ''
                  }`}
                >
                  <span className="text-base">🎬</span>
                  <span className="flex-1 truncate">{v.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}