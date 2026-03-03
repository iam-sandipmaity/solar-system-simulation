'use client';

import { useRef, useState, useEffect } from 'react';
import { useTimeStore, simDaysToDate } from '../physics/TimeScale';
import { useSolarStore } from '../SolarStore';
import Link from 'next/link';

const TIME_PRESETS = [
  { label: '1s/s',  value: 1 / 86400 },
  { label: '1m/s',  value: 1 / 1440 },
  { label: '1h/s',  value: 1 / 24 },
  { label: '6h/s',  value: 0.25 },
  { label: '1d/s',  value: 1 },
  { label: '7d/s',  value: 7 },
  { label: '30d/s', value: 30 },
  { label: '1y/s',  value: 365.25 },
];

function formatScale(ds: number): string {
  const mins = ds * 1440;
  if (mins < 1.5) return `${Math.round(mins * 60)}s/s`;
  if (mins < 90)  return `${Math.round(mins)}m/s`;
  const hrs = ds * 24;
  if (hrs < 36)   return `${Math.round(hrs)}h/s`;
  if (ds < 370)   return `${Math.round(ds)}d/s`;
  return `${(ds / 365.25).toFixed(1)}y/s`;
}

export function HUD() {
  const { timeScale, paused, simulationDays, setTimeScale, setPaused } = useTimeStore();
  const { showUI, toggleUI } = useSolarStore();
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime   = useRef(performance.now());

  useEffect(() => {
    let raf: number;
    const loop = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const btnBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ccc',
    borderRadius: 6,
    padding: '3px 9px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    pointerEvents: 'all',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 16,
        color: '#fff',
        fontFamily: 'inherit', fontSize: 13,
        zIndex: 20, pointerEvents: 'none',
      }}>
        <Link href="/" title="Back to home" style={{ color: '#aaa', textDecoration: 'none', display: 'flex', alignItems: 'center', pointerEvents: 'all', marginRight: 4 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <span style={{ fontWeight: 600, color: '#f0a030' }}>Solar System</span>
        <span style={{ color: '#555' }}>|</span>
        <span style={{ color: '#888' }}>{simDaysToDate(simulationDays)}</span>
        <span style={{ color: '#555' }}>|</span>
        <span style={{ color: paused ? '#f87' : '#7f7' }}>
          {paused ? 'Paused' : formatScale(timeScale)}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ color: fps < 30 ? '#f87' : '#7f7', fontSize: 11 }}>{fps} FPS</span>
        <button
          onClick={toggleUI}
          title={showUI ? 'Hide panels (H)' : 'Show panels (H)'}
          style={{
            ...btnBase,
            fontSize: 15,
            padding: '2px 8px',
            background: showUI ? 'rgba(255,255,255,0.07)' : 'rgba(240,160,48,0.22)',
            border: `1px solid ${showUI ? 'rgba(255,255,255,0.12)' : '#f0a030'}`,
            color: showUI ? '#aaa' : '#f0a030',
          }}
        >
          {showUI ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Time controls bar — bottom center */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.70)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        padding: '6px 12px',
        backdropFilter: 'blur(12px)',
        zIndex: 20,
        userSelect: 'none',
      }}>
        {/* Pause / Play */}
        <button
          onClick={() => setPaused(!paused)}
          style={{
            ...btnBase,
            background: paused ? 'rgba(240,160,48,0.25)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${paused ? '#f0a030' : 'rgba(255,255,255,0.12)'}`,
            color: paused ? '#f0a030' : '#ccc',
            fontSize: 13,
            padding: '3px 10px',
          }}
        >
          {paused
            ? <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M1 1.2L9 6L1 10.8V1.2Z"/></svg>
            : <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0.5" y="0.5" width="3" height="11" rx="0.8"/><rect x="6.5" y="0.5" width="3" height="11" rx="0.8"/></svg>
          }
        </button>

        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

        {/* Speed presets */}
        {TIME_PRESETS.map((p) => {
          const active = Math.abs(timeScale - p.value) / (p.value + 1e-9) < 0.01;
          return (
            <button
              key={p.label}
              onClick={() => { setTimeScale(p.value); setPaused(false); }}
              style={{
                ...btnBase,
                background: active ? 'rgba(240,160,48,0.25)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${active ? '#f0a030' : 'rgba(255,255,255,0.12)'}`,
                color: active ? '#f0a030' : '#aaa',
                fontWeight: active ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
