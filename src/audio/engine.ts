import { useStore } from '../store';

export class AudioEngine {
  ctx: AudioContext | null = null;
  source: MediaElementAudioSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  filters: BiquadFilterNode[] = [];
  gain: GainNode | null = null;
  audioEl: HTMLAudioElement | null = null;
  private _initialized = false;

  init(audio: HTMLAudioElement) {
    if (this._initialized && this.audioEl === audio) return;

    // If we already initialized on a DIFFERENT element, disconnect old graph
    if (this._initialized) return;

    this.audioEl = audio;
    this.ctx = new AudioContext();

    // Crucial: route audio through Web Audio
    this.source = this.ctx.createMediaElementSource(audio);

    // 11-band EQ
    const bands = [20, 40, 80, 160, 320, 640, 1250, 2500, 5000, 10000, 20000];
    let prev: AudioNode = this.source;
    this.filters = bands.map((freq, i) => {
      const f = this.ctx!.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === bands.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.0;
      f.gain.value = 0;
      prev.connect(f);
      prev = f;
      return f;
    });

    this.gain = this.ctx.createGain();
    this.gain.gain.value = useStore.getState().volume ?? 0.8;
    prev.connect(this.gain);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Apply whatever bands are already in the store (in case a preset was set first)
    this.setBands(useStore.getState().bands);

    this._initialized = true;
    console.log('[Engine] initialized. Filters:', this.filters.length);
  }

  async ensureRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch {}
    }
  }

  setBands(gains: number[]) {
    if (!this.filters.length) {
      console.warn('[Engine] setBands called before init');
      return;
    }
    const safe = (v: number) => Math.max(-15, Math.min(15, Number.isFinite(v) ? v : 0));
    this.filters.forEach((f, i) => { f.gain.value = safe(gains[i] ?? 0); });
    console.log('[Engine] bands applied:', this.filters.map(f => f.gain.value.toFixed(1)).join(' '));
  }

  setVolume(v: number) {
    if (this.gain) this.gain.gain.value = Math.max(0, Math.min(1.5, v));
  }

  spectrum(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const arr = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(arr);
    return arr;
  }
}

export const engine = new AudioEngine();