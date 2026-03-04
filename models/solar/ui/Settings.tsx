'use client';

import { useSolarStore } from '../SolarStore';

type CamView = 'angle' | 'top' | 'side' | 'front' | 'free';

const CAM_PRESETS: { id: Exclude<CamView, 'free'>; label: string; title: string }[] = [
  { id: 'angle', label: '45°',   title: 'Classic diagonal view' },
  { id: 'top',   label: 'Top',   title: 'Top-down overhead view' },
  { id: 'side',  label: 'Side',  title: 'Side view along ecliptic' },
  { id: 'front', label: 'Front', title: 'Front view along Z axis' },
];

function Toggle({ on, onChange, label, disabled = false }: {
  on: boolean; onChange: () => void; label: string; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.38 : 1 }}>
      <span style={{
        display: 'inline-block', width: 34, height: 18,
        background: on && !disabled ? '#f0a030' : '#444',
        borderRadius: 9, position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on && !disabled ? 17 : 2,
          width: 14, height: 14, background: '#fff',
          borderRadius: '50%', transition: 'left 0.2s',
        }} />
      </span>
      <input type="checkbox" checked={on} onChange={disabled ? undefined : onChange} readOnly={disabled} style={{ display: 'none' }} />
      <span style={{ color: '#ccc', fontSize: 12 }}>{label}</span>
    </label>
  );
}

export function Settings() {
  const {
    showUI,
    showOrbits, toggleOrbits,
    orbitFocus, toggleOrbitFocus,
    highlightFocusOrbit, toggleHighlightFocusOrbit,
    showAtmosphere, toggleAtmosphere,
    showRotation, toggleRotation,
    showSatelliteOrbits, toggleSatelliteOrbits,
    satelliteFocus, toggleSatelliteFocus,
    hideSiblingOrbits, toggleHideSiblingOrbits,
    selectedSatelliteId,
    showAsteroidBelt, toggleAsteroidBelt,
    showComets, toggleComets,
    showSpecificAsteroids, toggleSpecificAsteroids,
    showAllAsteroids, toggleShowAllAsteroids,
    asteroidOrbitReady,
    namedAsteroidCount,
    showLabels, toggleShowLabels,
    quality, setQuality,
    cameraView, setCameraView,
    focusMode, toggleFocusMode,
  } = useSolarStore();

  if (!showUI) return null;

  const btnBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#bbb',
    borderRadius: 6,
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: 11,
    fontFamily: 'inherit',
    transition: 'background 0.15s',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const activeBtn: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(240,160,48,0.22)',
    border: '1px solid #f0a030',
    color: '#f0a030',
    fontWeight: 600,
  };

  const freeBtn: React.CSSProperties = {
    ...btnBase,
    background: 'rgba(120,200,120,0.18)',
    border: '1px solid #6dc96d',
    color: '#6dc96d',
    fontWeight: 600,
  };

  const isFree = cameraView === 'free';

  return (
    <div style={{
      position: 'absolute',
      top: 60,
      left: 16,
      background: 'rgba(0,0,0,0.72)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: '10px 14px',
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: 13,
      backdropFilter: 'blur(12px)',
      zIndex: 20,
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 9,
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
    }}>

      <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Display</div>
      <Toggle on={showOrbits}          onChange={toggleOrbits}          label="Orbits" />
      {showOrbits && (
        <div style={{ paddingLeft: 14, borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
          <Toggle on={orbitFocus} onChange={toggleOrbitFocus} label="Selected planet only" />
        </div>
      )}
      <Toggle on={showAtmosphere}      onChange={toggleAtmosphere}      label="Atmosphere" />
      <Toggle on={showRotation}        onChange={toggleRotation}        label="Axial Rotation" />
      <Toggle on={showSatelliteOrbits} onChange={toggleSatelliteOrbits} label="Satellite Orbits" />
      {showSatelliteOrbits && (
        <div style={{ paddingLeft: 14, borderLeft: '2px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Toggle on={satelliteFocus} onChange={toggleSatelliteFocus} label="Selected planet sat. only" />
          <Toggle
            on={hideSiblingOrbits}
            onChange={toggleHideSiblingOrbits}
            label="Hide sibling orbits"
            disabled={!selectedSatelliteId}
          />
          {!selectedSatelliteId && (
            <span style={{ fontSize: 10, color: '#555', marginTop: -3 }}>Select a satellite to enable</span>
          )}
        </div>
      )}
      <Toggle on={highlightFocusOrbit} onChange={toggleHighlightFocusOrbit} label="Highlight focused orbit" />
      <Toggle on={showAsteroidBelt}       onChange={toggleAsteroidBelt}       label="Asteroid Belt" />
      <Toggle on={showComets}              onChange={toggleComets}              label="Comets" />
      <Toggle on={showSpecificAsteroids}   onChange={toggleSpecificAsteroids}   label={`Named Asteroids${namedAsteroidCount > 0 ? ` (${namedAsteroidCount.toLocaleString()})` : ''}`} />
      {showSpecificAsteroids && (
        <div style={{ paddingLeft: 14, borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
          <Toggle on={showAllAsteroids} onChange={toggleShowAllAsteroids} label={`Show all ${namedAsteroidCount > 0 ? namedAsteroidCount.toLocaleString() : '…'} + orbits`} />
          {showAllAsteroids && !asteroidOrbitReady && (
            <div style={{ fontSize: 10, color: '#f0a030', marginTop: 4, lineHeight: 1.5 }}>
              Building orbits… one moment
            </div>
          )}
          {showAllAsteroids && asteroidOrbitReady && (
            <div style={{ fontSize: 10, color: '#7bc47b', marginTop: 4, lineHeight: 1.5 }}>
              ✓ All orbits ready
            </div>
          )}
        </div>
      )}
      <Toggle on={showLabels}           onChange={toggleShowLabels}      label="Body Labels" />

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Quality</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button key={q} onClick={() => setQuality(q)} style={quality === q ? activeBtn : btnBase}>
              {q[0].toUpperCase() + q.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Camera View</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {CAM_PRESETS.map((v) => (
            <button key={v.id} title={v.title} onClick={() => setCameraView(v.id)}
              style={cameraView === v.id ? activeBtn : btnBase}>
              {v.label}
            </button>
          ))}
          <button title="Free — drag to any angle" onClick={() => setCameraView('free')}
            style={isFree ? freeBtn : btnBase}>
            Free
          </button>
        </div>
        {isFree && (
          <div style={{ fontSize: 10, color: '#5a9a5a', marginTop: 5, lineHeight: 1.5 }}>
            Drag to set any viewpoint.{focusMode && ' Tracks body from that angle.'}
          </div>
        )}
      </div>

      <label title="Track the selected planet / satellite" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <span style={{
          display: 'inline-block', width: 34, height: 18,
          background: focusMode ? '#f0a030' : '#444',
          borderRadius: 9, position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', top: 2, left: focusMode ? 17 : 2,
            width: 14, height: 14, background: '#fff',
            borderRadius: '50%', transition: 'left 0.2s',
          }} />
        </span>
        <input type="checkbox" checked={focusMode} onChange={toggleFocusMode} style={{ display: 'none' }} />
        <span style={{ color: '#ccc', fontSize: 12 }}>Focus Mode</span>
      </label>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, color: '#555', fontSize: 10, lineHeight: 1.8 }}>
        Drag → rotate &nbsp; Scroll → zoom<br />
        Right-drag → pan &nbsp; Click → info
      </div>
    </div>
  );
}
