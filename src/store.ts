import { create } from 'zustand';

type Module =
  | 'dj' | 'bose' | 'marshall' | 'sonos'
  | 'forge' | 'grabber' | 'ringtone' | 'settings' | 'video';

type Theme = 'innila' | 'redwood' | 'jazz' | 'cyber' | 'paper' | 'sunset';

interface Track { id: string; name: string; path: string; url?: string; }

interface VideoEntry {
  id: string;
  name: string;
  path: string;
  url?: string;
  lastPlayed: number;
}

interface State {
  module: Module;
  setModule: (m: Module) => void;

  theme: Theme;
  setTheme: (t: Theme) => void;

  playing: boolean;
  setPlaying: (p: boolean) => void;
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  trackName: string;
  setTrackName: (n: string) => void;

  playlist: Track[];
  setPlaylist: (t: Track[]) => void;
  addToPlaylist: (t: Track[]) => void;
  removeFromPlaylist: (id: string) => void;
  clearPlaylist: () => void;

  bands: number[];
  setBand: (i: number, v: number) => void;
  setBands: (b: number[]) => void;

  volume: number;
  setVolume: (v: number) => void;

  // ── Video ─────────────────────────────────────────
  videoHistory: VideoEntry[];
  setVideoHistory: (h: VideoEntry[]) => void;
  addVideoHistory: (v: VideoEntry) => void;
  clearVideoHistory: () => void;
}

const savedTheme =
  (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('innila-theme') as Theme | null)
    : null) || 'innila';

const savedVideos: VideoEntry[] =
  typeof localStorage !== 'undefined'
    ? JSON.parse(localStorage.getItem('innila-videos') || '[]')
    : [];

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = savedTheme;
}

export const useStore = create<State>((set) => ({
  module: 'dj',
  setModule: (module) => set({ module }),

  theme: savedTheme,
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('innila-theme', theme); } catch {}
    set({ theme });
  },

  playing: false,
  setPlaying: (playing) => set({ playing }),
  currentIndex: -1,
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  trackName: 'No track loaded',
  setTrackName: (trackName) => set({ trackName }),

  playlist: [],
  setPlaylist: (playlist) => set({ playlist }),
  addToPlaylist: (tracks) => set((s) => {
    const existing = new Set(s.playlist.map(t => t.path));
    const fresh = tracks.filter(t => !existing.has(t.path));
    return { playlist: [...s.playlist, ...fresh] };
  }),
  removeFromPlaylist: (id) =>
    set((s) => {
      const playlist = s.playlist.filter((t) => t.id !== id);
      const currentIndex = Math.min(s.currentIndex, playlist.length - 1);
      return { playlist, currentIndex };
    }),
  clearPlaylist: () => set({ playlist: [], currentIndex: -1, playing: false }),

  bands: Array(11).fill(0),
  setBand: (i, v) =>
    set((s) => {
      const b = [...s.bands];
      b[i] = v;
      return { bands: b };
    }),
  setBands: (bands) => set({ bands }),

  volume: 0.8,
  setVolume: (volume) => set({ volume }),

  videoHistory: savedVideos,
  setVideoHistory: (videoHistory) => {
    try { localStorage.setItem('innila-videos', JSON.stringify(videoHistory)); } catch {}
    set({ videoHistory });
  },
  addVideoHistory: (v) => set((s) => {
    const filtered = s.videoHistory.filter(x => x.path !== v.path);
    const next = [v, ...filtered].slice(0, 20);
    try { localStorage.setItem('innila-videos', JSON.stringify(next)); } catch {}
    return { videoHistory: next };
  }),
  clearVideoHistory: () => {
    try { localStorage.setItem('innila-videos', '[]'); } catch {}
    set({ videoHistory: [] });
  },
}));