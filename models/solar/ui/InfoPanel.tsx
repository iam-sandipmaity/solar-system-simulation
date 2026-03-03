'use client';

import { PLANETS, DWARF_PLANETS, SUN, MoonData, PlanetData } from '../data/planetData';
import { useSolarStore } from '../SolarStore';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ color: '#888', fontSize: 12 }}>{label}</span>
      <span style={{ color: '#eee', fontSize: 12, textAlign: 'right', maxWidth: 140 }}>{value}</span>
    </div>
  );
}

// ── Satellite info view ───────────────────────────────────────────────────────
function SatelliteInfoPanel() {
  const { selectedSatelliteId, selectedParentId, setSelectedSatellite, showUI } = useSolarStore();
  if (!selectedSatelliteId || !selectedParentId || !showUI) return null;

  const parent = [...PLANETS, ...DWARF_PLANETS].find((p: PlanetData) => p.id === selectedParentId);
  const moon   = parent?.satelliteData?.find((s: MoonData) => s.name === selectedSatelliteId);
  if (!moon || !parent) return null;

  const retrograde = moon.orbitalPeriod < 0;

  const fmtTemp = (t: { min?: number; max?: number; mean?: number }) => {
    if (t.min != null && t.max != null) return `${t.min}°C to ${t.max}°C`;
    if (t.mean != null) return `${t.mean}°C`;
    return '—';
  };

  return (
    <div style={{
      position: 'absolute', bottom: 80, right: 16, width: 290,
      background: 'rgba(0,0,0,0.80)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: 16, color: '#fff',
      fontFamily: 'inherit',
      backdropFilter: 'blur(16px)', zIndex: 20,
      maxHeight: 'calc(50vh - 80px)', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{moon.name}</span>
            {retrograde && (
              <span style={{ fontSize: 10, background: '#c0392b', color: '#fff', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
                RETROGRADE
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>
            Moon of{' '}
            <span
              style={{ color: '#f0a030', cursor: 'pointer' }}
              onClick={() => setSelectedSatellite(null, null)}
            >
              {parent.name}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSelectedSatellite(null, null)}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 0 }}
        >×</button>
      </div>

      <Row label="Radius"         value={`${moon.radius.toLocaleString()} km`} />
      <Row label="Diameter"       value={`${(moon.radius * 2).toLocaleString()} km`} />
      {moon.mass && <Row label="Mass" value={moon.mass} />}
      <Row label="Orbit Radius"   value={`${moon.orbitRadius.toLocaleString()} km`} />
      <Row label="Orbital Period" value={`${Math.abs(moon.orbitalPeriod).toFixed(4)} days${retrograde ? ' ↺' : ''}`} />
      {moon.orbitalInclination != null && (
        <Row label="Inclination" value={`${moon.orbitalInclination}°`} />
      )}
      {moon.gravity != null && (
        <Row label="Surface Gravity" value={`${moon.gravity} m/s²`} />
      )}
      {moon.surfaceTemps && (
        <Row label="Temperature" value={fmtTemp(moon.surfaceTemps)} />
      )}
    </div>
  );
}

// ── Planet info view ──────────────────────────────────────────────────────────
export function InfoPanel() {
  const { selectedPlanetId, selectedSatelliteId, selectedParentId,
          setSelectedPlanet, setSelectedSatellite, showUI } = useSolarStore();

  // Show satellite panel when a satellite is active
  if (selectedSatelliteId) return <SatelliteInfoPanel />;

  if (!selectedPlanetId || !showUI) return null;

  const planet = selectedPlanetId === 'sun' ? SUN
    : PLANETS.find((p) => p.id === selectedPlanetId)
    ?? DWARF_PLANETS.find((p) => p.id === selectedPlanetId);
  if (!planet) return null;

  const TYPE_LABELS: Record<string, string> = {
    terrestrial: 'Rocky Planet',
    'gas-giant': 'Gas Giant',
    'ice-giant': 'Ice Giant',
    dwarf:       'Dwarf Planet',
    star: 'Star (G-type)',
  };

  return (
    <div style={{
      position: 'absolute', bottom: 80, right: 16, width: 290,
      background: 'rgba(0,0,0,0.80)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: 16, color: '#fff',
      fontFamily: 'inherit',
      backdropFilter: 'blur(16px)', zIndex: 20,
      maxHeight: 'calc(50vh - 80px)', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{planet.name}</div>
          <div style={{ fontSize: 12, color: '#f0a030' }}>{TYPE_LABELS[planet.type] ?? planet.type}</div>
        </div>
        <button
          onClick={() => setSelectedPlanet(null)}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, padding: 0 }}
        >×</button>
      </div>

      {/* Data rows */}
      <Row label="Radius"         value={`${planet.radius.toLocaleString()} km`} />
      <Row label="Mass"           value={`${planet.mass.toExponential(3)} kg`} />
      {planet.orbitalPeriod > 0 && (
        <Row label="Orbital Period"  value={`${planet.orbitalPeriod.toLocaleString()} days`} />
      )}
      {planet.orbitalPeriod > 0 && (
        <Row label="Distance (AU)"  value={`${(planet.semiMajorAxis / 149_597_870.7).toFixed(3)} AU`} />
      )}
      <Row label="Rotation"       value={`${Math.abs(planet.rotationPeriod).toFixed(3)} days${planet.rotationPeriod < 0 ? ' (retrograde)' : ''}`} />
      <Row label="Axial Tilt"     value={`${planet.axialTilt}°`} />
      <Row label="Surface Gravity" value={`${planet.surfaceGravity} m/s²`} />
      <Row label="Avg Temperature" value={`${planet.meanTemperature}°C`} />
      {planet.moons > 0 && <Row label="Moons" value={String(planet.moons)} />}
      {planet.atmosphericPressure != null && (
        <Row label="Atmo. Pressure" value={`${planet.atmosphericPressure} bar`} />
      )}
      <Row label="Atmosphere" value={planet.atmosphericComposition} />

      {/* Satellites list */}
      {'satelliteData' in planet && planet.satelliteData && planet.satelliteData.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Known Satellites
          </div>
          {planet.satelliteData.map((moon: MoonData) => (
            <div
              key={moon.name}
              onClick={() => setSelectedSatellite(planet.id, moon.name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 8px', marginBottom: 3, borderRadius: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(240,160,48,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            >
              <span style={{ fontSize: 12, color: '#ddd' }}>{moon.name}</span>
              <span style={{ fontSize: 11, color: '#666' }}>
                {moon.radius >= 100
                  ? `${moon.radius.toLocaleString()} km`
                  : `${moon.radius} km`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Fun facts */}
      <div style={{ marginTop: 12 }}>
        {planet.funFacts.map((fact: string, i: number) => (
          <div key={i} style={{ fontSize: 11, color: '#bbb', marginBottom: 5, lineHeight: 1.5 }}>
            • {fact}
          </div>
        ))}
      </div>
    </div>
  );
}