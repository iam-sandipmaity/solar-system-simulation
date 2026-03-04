'use client';

import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { PLANETS, DWARF_PLANETS } from './data/planetData';
import { Sun } from './components/Sun';
import { Planet } from './components/Planet';

import { OrbitPath } from './components/OrbitPath';
import { Starfield } from './components/Starfield';
import { AsteroidBelt } from './components/AsteroidBelt';
import { Comets } from './components/Comets';
import { SpecificAsteroids } from './components/SpecificAsteroids';
import { CameraController } from './controls/CameraController';
import { useTimeStore } from './physics/TimeScale';
import { useSolarStore } from './SolarStore';

// Distribute planets at evenly-spaced starting angles
const INITIAL_ANGLES: Record<string, number> = {};
PLANETS.forEach((p, i) => {
  INITIAL_ANGLES[p.id] = (i / PLANETS.length) * 2 * Math.PI;
});
DWARF_PLANETS.forEach((p, i) => {
  INITIAL_ANGLES[p.id] = (i / DWARF_PLANETS.length) * 2 * Math.PI + 0.3;
});

export function SolarSystem({ onAsteroidsReady }: { onAsteroidsReady?: () => void }) {
  const { showOrbits, orbitFocus, selectedPlanetId, selectedSatelliteId, selectedParentId, showAsteroidBelt, showComets, showSpecificAsteroids, highlightFocusOrbit } = useSolarStore();

  // A planet's orbit is highlighted when it (or one of its satellites) is selected
  const highlightedPlanetId = selectedSatelliteId ? selectedParentId : selectedPlanetId;

  useFrame((_state, delta) => {
    useTimeStore.getState().tick(delta);
  });

  return (
    <>
      <CameraController />

      <Suspense fallback={null}>
        <Starfield />
        <Sun />
        <AsteroidBelt visible={showAsteroidBelt} onReady={onAsteroidsReady} />
        <Comets visible={showComets} />
        <SpecificAsteroids visible={showSpecificAsteroids} />

        {PLANETS.map((planet) => (
          <group key={planet.id}>
            <OrbitPath
              planet={planet}
              visible={showOrbits && (!orbitFocus || selectedPlanetId === planet.id)}
              highlighted={highlightFocusOrbit && highlightedPlanetId === planet.id}
            />
            <Planet data={planet} initialAngleOffset={INITIAL_ANGLES[planet.id]} />
          </group>
        ))}

        {DWARF_PLANETS.map((planet) => (
          <group key={planet.id}>
            <OrbitPath
              planet={planet}
              visible={showOrbits && (!orbitFocus || selectedPlanetId === planet.id)}
              highlighted={highlightFocusOrbit && highlightedPlanetId === planet.id}
            />
            <Planet data={planet} initialAngleOffset={INITIAL_ANGLES[planet.id]} />
          </group>
        ))}
      </Suspense>
    </>
  );
}
