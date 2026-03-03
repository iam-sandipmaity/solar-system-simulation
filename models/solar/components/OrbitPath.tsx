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

  const lineObject = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  }, [points]);

  if (!visible) return null;

  return <primitive object={lineObject} />;
}
