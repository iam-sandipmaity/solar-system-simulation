'use client';

import { PLANETS, DWARF_PLANETS, SUN } from '../data/planetData';
import { useSolarStore } from '../SolarStore';

export function PlanetSelector() {
  const { selectedPlanetId, setSelectedPlanet, showUI } = useSolarStore();

  if (!showUI) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 72,
      right: 16,
      width: 160,
      background: 'rgba(0,0,0,0.72)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      padding: 10,
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: 13,
      backdropFilter: 'blur(12px)',
      zIndex: 20,
      userSelect: 'none',
      maxHeight: 'calc(48vh - 72px)',
      overflowY: 'auto',
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Planets
      </div>

      {/* Sun entry */}
      <button
        onClick={() => setSelectedPlanet(selectedPlanetId === 'sun' ? null : 'sun')}
        style={itemStyle(selectedPlanetId === 'sun')}
      >
        Sun
      </button>

      {PLANETS.map((p) => (
        <button
          key={p.id}
          onClick={() => setSelectedPlanet(selectedPlanetId === p.id ? null : p.id)}
          style={itemStyle(selectedPlanetId === p.id)}
        >
          {p.name}
        </button>
      ))}

      <div style={{ color: '#666', fontSize: 11, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
        Dwarf Planets
      </div>

      {DWARF_PLANETS.map((p) => (
        <button
          key={p.id}
          onClick={() => setSelectedPlanet(selectedPlanetId === p.id ? null : p.id)}
          style={itemStyle(selectedPlanetId === p.id)}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

function itemStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: selected ? 'rgba(240,160,48,0.25)' : 'transparent',
    border: `1px solid ${selected ? '#f0a030' : 'transparent'}`,
    borderRadius: 7,
    color: selected ? '#f0a030' : '#ddd',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 13,
    marginBottom: 2,
    transition: 'background 0.15s',
  };
}
