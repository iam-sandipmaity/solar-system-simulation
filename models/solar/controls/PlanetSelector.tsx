'use client';

import { useState } from 'react';
import { PLANETS, DWARF_PLANETS } from '../data/planetData';
import { useSolarStore } from '../SolarStore';

export function PlanetSelector() {
  const {
    selectedPlanetId, setSelectedPlanet,
    selectedAsteroidId, setSelectedAsteroid,
    selectedSpacecraftId, setSelectedSpacecraft,
    asteroidNames, showSpecificAsteroids,
    showSpacecraft,
    showUI,
  } = useSolarStore();

  const [asteroidFilter, setAsteroidFilter] = useState('');

  if (!showUI) return null;

  const sortedAsteroidNames = [...asteroidNames].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });

  const filteredAsteroidNames = asteroidFilter.trim()
    ? sortedAsteroidNames.filter((n) =>
        n.toLowerCase().includes(asteroidFilter.toLowerCase()))
    : sortedAsteroidNames;

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
      maxHeight: 'calc(90vh - 80px)',
      overflowY: 'auto',
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Planets
      </div>

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

      {/* Named Asteroids section */}
      {showSpecificAsteroids && sortedAsteroidNames.length > 0 && (
        <>
          <div style={{ color: '#666', fontSize: 11, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Named Asteroids
            <span style={{ color: '#444', fontWeight: 400, marginLeft: 4, textTransform: 'none', letterSpacing: 0 }}>
              ({sortedAsteroidNames.length})
            </span>
          </div>

          <input
            type="text"
            placeholder="Search…"
            value={asteroidFilter}
            onChange={(e) => setAsteroidFilter(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6,
              color: '#ddd',
              fontSize: 11,
              padding: '4px 7px',
              marginBottom: 6,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />

          {filteredAsteroidNames.slice(0, 300).map((name) => (
            <button
              key={name}
              onClick={() => setSelectedAsteroid(selectedAsteroidId === name ? null : name)}
              style={asteroidItemStyle(selectedAsteroidId === name)}
            >
              {name}
            </button>
          ))}

          {filteredAsteroidNames.length > 300 && (
            <div style={{ color: '#444', fontSize: 10, padding: '4px 8px' }}>
              {filteredAsteroidNames.length - 300} more — use search to filter
            </div>
          )}
        </>
      )}

      {showSpacecraft && (
        <>
          <div style={{ color: '#666', fontSize: 11, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Spacecraft
          </div>
          {SPACECRAFT_LIST.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelectedSpacecraft(selectedSpacecraftId === sc.id ? null : sc.id)}
              style={spacecraftItemStyle(selectedSpacecraftId === sc.id)}
            >
              {sc.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

const SPACECRAFT_LIST = [
  { id: 'voyager1', name: 'Voyager 1' },
  { id: 'voyager2', name: 'Voyager 2' },
  { id: 'pioneer10', name: 'Pioneer 10' },
  { id: 'pioneer11', name: 'Pioneer 11' },
  { id: 'newhorizons', name: 'New Horizons' },
  { id: 'parker', name: 'Parker Solar Probe' },
  { id: 'juno', name: 'Juno' },
  { id: 'cassini', name: 'Cassini' },
];

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

function spacecraftItemStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: selected ? 'rgba(126,200,255,0.18)' : 'transparent',
    border: `1px solid ${selected ? '#7ec8ff' : 'transparent'}`,
    borderRadius: 7,
    color: selected ? '#7ec8ff' : '#ddd',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 13,
    marginBottom: 2,
    transition: 'background 0.15s',
  };
}

function asteroidItemStyle(selected: boolean): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: selected ? 'rgba(255,213,128,0.18)' : 'transparent',
    border: `1px solid ${selected ? '#FFD580' : 'transparent'}`,
    borderRadius: 7,
    color: selected ? '#FFD580' : '#bbb',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 12,
    marginBottom: 2,
    transition: 'background 0.15s',
    fontFamily: 'monospace',
  };
}

