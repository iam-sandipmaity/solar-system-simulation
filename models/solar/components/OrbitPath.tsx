'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PlanetData } from '../data/planetData';
import { getOrbitPoints } from '../physics/OrbitalMechanics';

interface OrbitPathProps {
  planet: PlanetData;
  visible?: boolean;
}

export function OrbitPath({ planet, visible = true }: OrbitPathProps) {
  const points = useMemo(
    () =>
      getOrbitPoints(
        planet.semiMajorAxis,
        planet.eccentricity,
        planet.inclination,
        planet.longitudeOfAscendingNode,
        planet.argumentOfPerihelion,
        256,
      ),
    [planet],
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [points]);

  if (!visible) return null;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </line>
  );
}
