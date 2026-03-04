'use client';

/**
 * AsteroidInfoPanel.tsx
 *
 * Info panel for the currently-selected specific (named) asteroid.
 * Styled to match InfoPanel.tsx (bottom-right, same blur card).
 */

import { useSolarStore } from '../SolarStore';
import { asteroidInfoMap } from '../components/SpecificAsteroids';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, lineHeight: 1.6 }}>
      <span style={{ color: '#888', fontSize: 11, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ddd', fontSize: 11, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

/** Convert a jdOffset (days from J2000.0 = 2000-Jan-01.5) to a UTC date string */
function jdOffsetToDate(jdOff: number): string {
  // JD 2451545.0 = 2000-01-01 12:00 TT
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  const ms = J2000_MS + jdOff * 86_400_000;
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

export function AsteroidInfoPanel() {
  const { selectedAsteroidId, setSelectedAsteroid } = useSolarStore();

  if (!selectedAsteroidId) return null;

  const info = asteroidInfoMap.get(selectedAsteroidId);
  // info may be momentarily undefined if the binary hasn't loaded yet
  const distStr = info ? `${info.distAU.toFixed(4)} AU` : '…';

  const panelStyle: React.CSSProperties = {
    position:       'absolute',
    bottom:         80,
    right:          16,
    width:          290,
    background:     'rgba(10,12,16,0.82)',
    border:         '1px solid rgba(255,255,255,0.10)',
    borderRadius:   14,
    padding:        '14px 16px',
    color:          '#fff',
    fontFamily:     'inherit',
    fontSize:       13,
    backdropFilter: 'blur(18px)',
    zIndex:         30,
    userSelect:     'none',
    pointerEvents:  'auto',
  };

  const headerStyle: React.CSSProperties = {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   10,
  };

  const closeStyle: React.CSSProperties = {
    background:  'rgba(255,255,255,0.06)',
    border:      '1px solid rgba(255,255,255,0.10)',
    borderRadius: 6,
    color:        '#aaa',
    cursor:       'pointer',
    fontSize:     11,
    padding:      '2px 8px',
    fontFamily:   'inherit',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
            Named Asteroid
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#FFD580', letterSpacing: 0.5 }}>
            {selectedAsteroidId}
          </div>
        </div>
        <button
          style={closeStyle}
          onClick={() => setSelectedAsteroid(null)}
          title="Deselect"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Distance from Sun" value={distStr} />
        {info && (
          <>
            <Row label="Data samples" value={info.sampleCount.toLocaleString()} />
            <Row label="Data range start" value={jdOffsetToDate(info.jdFirst)} />
            <Row label="Data range end"   value={jdOffsetToDate(info.jdLast)} />
          </>
        )}
        <div style={{
          marginTop: 8,
          padding:   '6px 9px',
          background: 'rgba(255,213,128,0.07)',
          border:     '1px solid rgba(255,213,128,0.15)',
          borderRadius: 8,
          fontSize:   10,
          color:      '#aaa',
          lineHeight: 1.6,
        }}>
          Position interpolated from real NASA Horizons ephemeris data.
          The data window loops when the simulation time is out of range.
        </div>
      </div>
    </div>
  );
}
