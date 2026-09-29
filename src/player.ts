import { engine } from './audio/engine';
import { useStore } from './store';

class Player {
  el: HTMLAudioElement | null = null;
  private loadToken = 0;

  attach(el: HTMLAudioElement) {
    if (this.el === el) return;
    this.el = el;

    try {
      engine.init(el);
    } catch (e) {
      console.warn('[Player] engine init warning:', e);
    }

    el.addEventListener('ended', () => this.next());
    el.addEventListener('play', () => useStore.getState().setPlaying(true));
    el.addEventListener('pause', () => useStore.getState().setPlaying(false));
    el.addEventListener('error', () => {
      console.warn('[Player] audio element error:', el.error);
      useStore.getState().setPlaying(false);
    });
  }

  async loadIndex(i: number, autoplay = false) {
    const token = ++this.loadToken;
    console.log('[Player] loadIndex →', i, 'token:', token);

    const { playlist, setCurrentIndex } = useStore.getState();
    if (i < 0 || i >= playlist.length) {
      console.warn('[Player] index out of range');
      return;
    }

    const track = playlist[i];
    setCurrentIndex(i);
    useStore.getState().setTrackName(track.name);

    if (!this.el) {
      console.error('[Player] audio element not attached!');
      return;
    }

    // ⏸️ Stop whatever is currently playing BEFORE swapping source
    try { this.el.pause(); } catch {}

    // Read file bytes if not already a blob URL
    if (!track.url) {
      try {
        const res = await (window as any).forge?.readFile?.(track.path);
        // 🚫 If another click happened during the async read, abort
        if (token !== this.loadToken) {
          console.log('[Player] aborted stale load (token mismatch)');
          return;
        }
        if (!res?.ok) throw new Error(res?.error || 'read failed');

        const bin = atob(res.data);
        const bytes = new Uint8Array(bin.length);
        for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        const blob = new Blob([bytes], { type: res.mime });
        const url = URL.createObjectURL(blob);

        useStore.setState((s) => ({
          playlist: s.playlist.map((t, idx) => (idx === i ? { ...t, url } : t)),
        }));

        this.el.src = url;
      } catch (err) {
        console.error('[Player] file read failed:', err);
        return;
      }
    } else {
      this.el.src = track.url;
    }

    this.el.load();

    if (autoplay) {
      // ⏱️ Wait a tick so the load() can settle before play()
      await new Promise(r => setTimeout(r, 50));
      if (token !== this.loadToken) {
        console.log('[Player] aborted stale autoplay');
        return;
      }
      await this.play();
    }
  }

  async play() {
    const el = this.el;
    if (!el) return;
    try {
      await engine.ensureRunning();
      if (engine.audioEl !== el) engine.init(el);

      // 🔒 Ensure previous play() fully cancelled
      if (!el.paused) {
        console.log('[Player] already playing — no-op');
        return;
      }

      await el.play();
      useStore.getState().setPlaying(true);
      console.log('[Player] ✅ playing');
    } catch (err) {
      const msg = (err as Error).message;
      // 🔊 Suppress the "interrupted by new load" — it's expected on rapid clicks
      if (msg.includes('interrupted by a new load')) {
        console.log('[Player] play() aborted (superseded by new load) — harmless');
        return;
      }
      console.error('[Player] play failed:', err);
      alert('Could not play: ' + msg);
    }
  }

  pause() {
    this.el?.pause();
    useStore.getState().setPlaying(false);
  }

  toggle() {
    const s = useStore.getState();
    if (s.playing) this.pause();
    else this.play();
  }

  next() {
    const { currentIndex, playlist } = useStore.getState();
    if (currentIndex < playlist.length - 1) {
      this.loadIndex(currentIndex + 1, true);
    } else {
      useStore.getState().setPlaying(false);
    }
  }

  prev() {
    const { currentIndex } = useStore.getState();
    if (currentIndex > 0) this.loadIndex(currentIndex - 1, true);
  }
}

export const player = new Player();