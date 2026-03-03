'use client';

import { useTimeStore, simDaysToDate } from '../physics/TimeScale';

const PRESETS = [
  { label: '1d/s', value: 1 },
  { label: '10d/s', value: 10 },
  { label: '30d/s', value: 30 },
  { label: '365d/s', value: 365 },
];

export function TimeControls() {
  const { timeScale, paused, setTimeScale, setPaused, reset, simulationDays } = useTimeStore();

  return (
    <div style={{
      position: 'absolute',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'rgba(0,0,0,0.72)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: '10px 18px',
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: 13,
      backdropFilter: 'blur(12px)',
      userSelect: 'none',
      zIndex: 30,
    }}>
      {/* Date */}
      <span style={{ color: '#aaa', minWidth: 160, textAlign: 'center' }}>
        {simDaysToDate(simulationDays)}
      </span>

      <div style={{ width: 1, height: 24, background: '#333', margin: '0 4px' }} />

      {/* Play/Pause */}
      <button
        onClick={() => setPaused(!paused)}
        style={btnStyle}
        title={paused ? 'Resume' : 'Pause'}
      >
        {paused
          ? <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M1 1.2L9 6L1 10.8V1.2Z"/></svg>
          : <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><rect x="0.5" y="0.5" width="3" height="11" rx="0.8"/><rect x="6.5" y="0.5" width="3" height="11" rx="0.8"/></svg>
        }
      </button>

      {/* Speed presets */}
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => { setTimeScale(p.value); setPaused(false); }}
          style={{ ...btnStyle, background: timeScale === p.value && !paused ? '#f0a030' : 'rgba(255,255,255,0.08)', color: timeScale === p.value && !paused ? '#000' : '#fff' }}
        >
          {p.label}
        </button>
      ))}

      {/* Reset */}
      <button onClick={reset} style={btnStyle} title="Reset to today">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M1.5 6.5A5 5 0 0 1 6.5 1.5a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <polyline points="9.5,0.5 11.8,3 9.5,5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  color: '#fff',
  padding: '5px 10px',
  cursor: 'pointer',
  fontSize: 13,
  transition: 'background 0.15s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};
