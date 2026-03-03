'use client';

import { useSolarStore } from '../SolarStore';

type View = 'angle' | 'top' | 'side' | 'front' | 'free';

const PRESETS: { id: Exclude<View, 'free'>; label: string; title: string }[] = [
  { id: 'angle', label: '45°',   title: 'Perspective — classic diagonal view' },
  { id: 'top',   label: 'Top',   title: 'Top-down overhead view' },
  { id: 'side',  label: 'Side',  title: 'Side view along ecliptic' },
  { id: 'front', label: 'Front', title: 'Front view along Z axis' },
];

export function CameraViewPanel() {
  const { cameraView, setCameraView, focusMode, toggleFocusMode } = useSolarStore();

  const base: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#bbb',
    borderRadius: 7,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    transition: 'background 0.15s, border-color 0.15s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const activeStyle: React.CSSProperties = {
    ...base,
    background: 'rgba(240,160,48,0.22)',
    border: '1px solid #f0a030',
    color: '#f0a030',
    fontWeight: 600,
  };

  const freeActive: React.CSSProperties = {
    ...base,
    background: 'rgba(120,200,120,0.18)',
    border: '1px solid #6dc96d',
    color: '#6dc96d',
    fontWeight: 600,
  };

  const isFree = cameraView === 'free';

  return (
    <div style={{
      position: 'absolute',
      bottom: 72,
      right: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(0,0,0,0.70)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 12,
      padding: '10px 12px',
      backdropFilter: 'blur(12px)',
      zIndex: 20,
      userSelect: 'none',
      minWidth: 200,
    }}>
      {/* Label */}
      <div style={{ color: '#666', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
        Camera View
      </div>

      {/* Preset buttons row */}
      <div style={{ display: 'flex', gap: 5 }}>
        {PRESETS.map((v) => (
          <button
            key={v.id}
            title={v.title}
            onClick={() => setCameraView(v.id)}
            style={cameraView === v.id ? activeStyle : base}
          >
            {v.label}
          </button>
        ))}

        {/* Free button */}
        <button
          title="Free — drag to any angle. Works with Focus Mode to track the body from your custom viewpoint."
          onClick={() => setCameraView('free')}
          style={isFree ? freeActive : base}
        >
          Free
        </button>
      </div>

      {/* Hint when free is active */}
      {isFree && (
        <div style={{ fontSize: 10, color: '#5a9a5a', lineHeight: 1.5 }}>
          Drag to set any viewpoint.
          {focusMode && ' Focus Mode will track from that angle.'}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

      {/* Focus mode toggle */}
      <label
        title="Track the selected planet / satellite as it moves"
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      >
        <span style={{
          display: 'inline-block', width: 34, height: 18,
          background: focusMode ? '#f0a030' : '#444',
          borderRadius: 9, position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', top: 2,
            left: focusMode ? 17 : 2,
            width: 14, height: 14,
            background: '#fff', borderRadius: '50%', transition: 'left 0.2s',
          }} />
        </span>
        <input type="checkbox" checked={focusMode} onChange={toggleFocusMode} style={{ display: 'none' }} />
        <span style={{ color: focusMode ? '#f0a030' : '#888', fontSize: 11 }}>
          Focus Mode
        </span>
      </label>

      {/* Combined mode description */}
      <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5, marginTop: -2 }}>
        {focusMode && !isFree && 'Camera tracks selection from preset angle.'}
        {focusMode && isFree  && 'Camera follows selection from your viewpoint.'}
        {!focusMode            && 'Free-look — camera stays where you leave it.'}
      </div>
    </div>
  );
}

