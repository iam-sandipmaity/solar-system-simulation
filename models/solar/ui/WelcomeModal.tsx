'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  onLaunched: () => void;
  asteroidsReady?: boolean;
}

// Loading stages shown in the status bar
const STAGES = [
  { label: 'Initialising scene…',        target: 30 },
  { label: 'Loading planet textures…',   target: 62 },
  { label: 'Loading asteroid data…',     target: 92 },  // stalls here until signal
  { label: 'Finalising…',               target: 100 },
];

export function WelcomeModal({ onLaunched, asteroidsReady = false }: Props) {
  const [phase, setPhase]       = useState<'intro' | 'loading' | 'done'>('intro');
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGES[0].label);
  const rafRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progRef   = useRef(0);   // live progress (avoid closure stale ref)
  const readyRef  = useRef(asteroidsReady);

  // Keep readyRef in sync so the animation loop can read it
  useEffect(() => { readyRef.current = asteroidsReady; }, [asteroidsReady]);

  const handleLaunch = () => { setPhase('loading'); };

  useEffect(() => {
    if (phase !== 'loading') return;

    // Tick every ~16 ms, advancing toward next stage target.
    // The "asteroid data" stage (target 92%) stalls until readyRef is true.
    const tick = () => {
      const cur = progRef.current;

      // Find which stage we're in
      const stageIdx  = STAGES.findIndex(s => cur < s.target);
      const stage     = STAGES[stageIdx] ?? STAGES[STAGES.length - 1];

      setStageLabel(stage.label);

      // Stall at 92% until asteroids are actually ready
      if (cur >= 62 && cur < 92 && !readyRef.current) {
        // Drift very slowly (1% per 800ms) to show activity but not finish
        const next = Math.min(cur + 0.02, 91);
        progRef.current = next;
        setProgress(Math.round(next));
        rafRef.current = setTimeout(tick, 16);
        return;
      }

      // Normal advance: ease out as we approach each stage target
      const gap  = stage.target - cur;
      const step = Math.max(gap * 0.035, 0.12);
      const next = Math.min(cur + step, 100);

      progRef.current = next;
      setProgress(Math.round(next));

      if (next >= 100) {
        setPhase('done');
        setTimeout(onLaunched, 220);
      } else {
        rafRef.current = setTimeout(tick, 16);
      }
    };

    rafRef.current = setTimeout(tick, 16);
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, [phase, onLaunched]);

  if (phase === 'done') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'inherit',
      backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 620,
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 0 80px rgba(249,115,22,0.12)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f05 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '28px 32px 24px',
          textAlign: 'center',
        }}>
          {/* Saturn icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="52" height="48" viewBox="0 0 52 48" fill="none">
              <defs>
                <radialGradient id="wm-pg" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#f0d080"/>
                  <stop offset="55%" stopColor="#c8842a"/>
                  <stop offset="100%" stopColor="#7a4010"/>
                </radialGradient>
              </defs>
              <ellipse cx="26" cy="32" rx="25" ry="7" stroke="#b8820a" strokeWidth="2.5" fill="none" opacity="0.5"/>
              <circle cx="26" cy="24" r="14" fill="url(#wm-pg)"/>
              <ellipse cx="26" cy="21" rx="14" ry="2.8" fill="#7a4010" opacity="0.35"/>
              <ellipse cx="26" cy="26" rx="14" ry="2.2" fill="#7a4010" opacity="0.25"/>
              <path d="M1 32 Q26 42 51 32" stroke="#d4a030" strokeWidth="3" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #facc15, #f97316, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.01em',
          }}>
            Solar System Simulation
          </h1>
          <p style={{ margin: '8px 0 0', color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>
            A physics-accurate, real-time 3D simulation powered by NASA JPL orbital data.
            Explore 8 planets, dwarf planets, and over 20 moons.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Nav controls */}
          <Section title="Navigation">
            <Grid items={[
              ['Drag',        'Rotate camera'],
              ['Scroll',      'Zoom in / out'],
              ['Right-drag',  'Pan view'],
              ['Click body',  'Focus & info'],
            ]} />
          </Section>

          {/* Settings overview */}
          <Section title="Settings panel  (top-left)">
            <ul style={{ margin: 0, paddingLeft: 18, color: '#9ca3af', fontSize: 12.5, lineHeight: 1.8 }}>
              <li>Toggle <b style={{ color: '#d1d5db' }}>Orbits</b>, <b style={{ color: '#d1d5db' }}>Atmosphere</b>, <b style={{ color: '#d1d5db' }}>Axial Rotation</b>, <b style={{ color: '#d1d5db' }}>Asteroid Belt</b></li>
              <li><b style={{ color: '#d1d5db' }}>Satellite Orbits</b> — show/hide moon paths globally or per-planet only</li>
              <li><b style={{ color: '#d1d5db' }}>Body Labels</b> — name tags that appear on hover or selection</li>
              <li><b style={{ color: '#d1d5db' }}>Camera View</b> — 45°, Top, Side, Front, or Free-look presets</li>
              <li><b style={{ color: '#d1d5db' }}>Focus Mode</b> — camera tracks the selected body continuously</li>
              <li><b style={{ color: '#d1d5db' }}>Quality</b> — Low / Medium / High texture resolution</li>
            </ul>
          </Section>

          {/* Time controls */}
          <Section title="Time controls  (bottom)">
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 12.5, lineHeight: 1.7 }}>
              Pause, play, or jump between speed presets —
              <span style={{ color: '#d1d5db' }}> 1s/m · 1m/s · 1h/s · 6h/s · 1d/s · 7d/s · 30d/s · 1y/s</span>.
              The date shown in the HUD updates in real time.
            </p>
          </Section>

          {/* Launch / loading */}
          {phase === 'intro' ? (
            <button
              onClick={handleLaunch}
              style={{
                marginTop: 4,
                padding: '14px 0',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(90deg, #eab308, #f97316)',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Launch Simulation →
            </button>
          ) : (
            <div style={{ marginTop: 4 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#6b7280',
                fontSize: 12,
                marginBottom: 8,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Spinner dot */}
                  <span style={{
                    display: 'inline-block',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#f97316',
                    animation: 'ast-pulse 1s ease-in-out infinite',
                  }} />
                  {stageLabel}
                </span>
                <span style={{ color: '#f97316' }}>{progress}%</span>
              </div>
              <div style={{
                height: 6,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 99,
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #eab308, #f97316)',
                  transition: 'width 0.04s linear',
                }} />
              </div>
              <style>{`@keyframes ast-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: '#f97316',
        marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Grid({ items }: { items: [string, string][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
      {items.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
          <span style={{ color: '#d1d5db', fontWeight: 500 }}>{key}</span>
          <span style={{ color: '#6b7280' }}>{val}</span>
        </div>
      ))}
    </div>
  );
}
