import Card from '@/components/Card';
import { useStore } from '@/store';

const THEMES = [
  {
    id: 'innila',
    name: 'Innila Dark',
    desc: 'The original — coral on obsidian',
    preview: {
      bg: '#0a0a0f', surface: '#12121a', accent: '#00e5ff', accent2: '#ff6b9d', highlight: '#a3ff12',
    },
  },
  {
    id: 'redwood',
    name: 'Oracle Redwood',
    desc: 'Inspired by Oracle Redwood — deep burgundy + gold',
    preview: {
      bg: '#1a0a0c', surface: '#2a1014', accent: '#c96442', accent2: '#dc4452', highlight: '#e8b75e',
    },
  },
  {
    id: 'jazz',
    name: 'Midnight Jazz',
    desc: 'Deep navy + amber glow',
    preview: {
      bg: '#0c0e1a', surface: '#141628', accent: '#6ca8ff', accent2: '#be8cff', highlight: '#fabe5a',
    },
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    desc: 'Magenta + toxic lime on black',
    preview: {
      bg: '#05050c', surface: '#0e0e18', accent: '#00ffdc', accent2: '#ff2dbe', highlight: '#dcff5a',
    },
  },
  {
    id: 'paper',
    name: 'Paper Light',
    desc: 'Warm off-white — for daytime use',
    preview: {
      bg: '#f8f5f0', surface: '#fffcf7', accent: '#5a82c8', accent2: '#c85064', highlight: '#64963c',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Warmth',
    desc: 'Peach, rose, and warm amber',
    preview: {
      bg: '#201018', surface: '#301822', accent: '#ff8c5a', accent2: '#dc5a8c', highlight: '#ffc878',
    },
  },
] as const;

export default function Settings() {
  const { theme, setTheme } = useStore();

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <Card title="Appearance — Themes">
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`text-left p-4 rounded-2xl transition-all border-2 ${
                  active
                    ? 'border-accent shadow-lg scale-[1.01]'
                    : 'border-border/50 hover:border-border'
                }`}
                style={{
                  background: t.preview.bg,
                  borderColor: active ? t.preview.accent : undefined,
                }}
              >
                {/* Preview swatches */}
                <div className="flex gap-1 mb-3">
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview.bg }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview.surface }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview.accent }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview.accent2 }} />
                  <div className="w-8 h-8 rounded-lg" style={{ background: t.preview.highlight }} />
                </div>

                <div className="flex items-center justify-between">
                  <div
                    className="text-sm font-bold"
                    style={{ color: t.preview.highlight }}
                  >
                    {t.name}
                  </div>
                  {active && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: t.preview.accent,
                        color: t.preview.bg,
                      }}
                    >
                      ✓ ACTIVE
                    </span>
                  )}
                </div>
                <div
                  className="text-[11px] mt-1"
                  style={{ color: t.preview.highlight + 'aa' }}
                >
                  {t.desc}
                </div>

                {t.id === 'redwood' && (
                  <div
                    className="mt-3 text-[10px] px-2 py-1 rounded-lg inline-block"
                    style={{
                      background: t.preview.highlight + '22',
                      color: t.preview.highlight,
                      border: `1px solid ${t.preview.highlight}44`,
                    }}
                  >
                    🏛️ Oracle Redwood inspired
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-[11px] text-muted">
          Theme is saved automatically. Your choice persists across restarts.
        </div>
      </Card>

      <Card title="About Innila">
        <div className="text-sm space-y-2 text-muted">
          <div>
            <span className="text-highlight font-semibold">♥ Innila</span> — a family
            audio studio for Bengaluru.
          </div>
          <div className="text-xs">
            AI DJ · Bose EQ · Marshall tuning · Sonos rooms · Forge analysis ·
            YouTube/Instagram grabber · Ringtone cutter · Multi-theme skins
          </div>
          <div className="text-xs pt-2 border-t border-border/40">
            Version 1.0 · Built with Electron + React + Web Audio API
          </div>
        </div>
      </Card>

      <Card title="Keyboard Shortcuts">
        <ul className="text-xs text-muted space-y-1.5 font-mono">
          <li className="flex justify-between">
            <span>Play / Pause</span><span className="text-highlight">Ctrl + Space</span>
          </li>
          <li className="flex justify-between">
            <span>Next track</span><span className="text-highlight">Ctrl + →</span>
          </li>
          <li className="flex justify-between">
            <span>Previous track</span><span className="text-highlight">Ctrl + ←</span>
          </li>
          <li className="flex justify-between">
            <span>Reload app</span><span className="text-highlight">Ctrl + R</span>
          </li>
          <li className="flex justify-between">
            <span>DevTools</span><span className="text-highlight">F12</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}