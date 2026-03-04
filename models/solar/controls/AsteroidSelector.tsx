'use client';

import { useSolarStore } from '../SolarStore';
import { asteroidInfoMap } from '../components/SpecificAsteroids';

export function AsteroidSelector() {
  const { selectedAsteroidId, setSelectedAsteroid, showSpecificAsteroids, showUI, asteroidNames } = useSolarStore();

  if (!showUI || !showSpecificAsteroids) return null;

  const names = [...asteroidNames].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });

  if (names.length === 0) return null;

  return (
    <div style={{
      position:       'absolute',
      top:            72,
      right:          192,   // sits left of the PlanetSelector (160 + 16 + 16 = 192)
      width:          150,
      background:     'rgba(0,0,0,0.72)',
      border:         '1px solid rgba(255,255,255,0.1)',
      borderRadius:   14,
      padding:        10,
      color:          '#fff',
      fontFamily:     'inherit',
      fontSize:       13,
      backdropFilter: 'blur(12px)',
      zIndex:         20,
      userSelect:     'none',
      maxHeight:      'calc(48vh - 72px)',
      overflowY:      'auto',
    }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
        Named Asteroids
      </div>

      {names.map((name) => {
        const selected = selectedAsteroidId === name;
        const info     = asteroidInfoMap.get(name);
        return (
          <button
            key={name}
            title={info ? `${info.sampleCount} samples · ${info.distAU.toFixed(3)} AU` : name}
            onClick={() => setSelectedAsteroid(selected ? null : name)}
            style={{
              display:      'block',
              width:        '100%',
              textAlign:    'left',
              background:   selected ? 'rgba(255,213,128,0.18)' : 'transparent',
              border:       `1px solid ${selected ? '#FFD580' : 'transparent'}`,
              borderRadius: 7,
              color:        selected ? '#FFD580' : '#ddd',
              padding:      '5px 8px',
              cursor:       'pointer',
              fontSize:     13,
              marginBottom: 2,
              transition:   'background 0.15s',
            }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
