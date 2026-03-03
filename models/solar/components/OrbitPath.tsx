'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PlanetData } from '../data/planetData';
import { getOrbitPoints } from '../physics/OrbitalMechanics';

interface OrbitPathProps {
  planet: PlanetData;
  visible?: boolean;
  highlighted?: boolean;
}

export function OrbitPath({ planet, visible = true, highlighted = false }: OrbitPathProps) {
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
    // Feed the 512 Keplerian sample points into a closed Catmull-Rom spline
    // and re-sample at 4096 output points. With no duplicate closing point in
    // the input the spline is perfectly smooth at any zoom level.
    const curve = new THREE.CatmullRomCurve3(points, true /* closed */, 'catmullrom', 0.5);
    const smoothPts = curve.getPoints(4096);
    const geo = new THREE.BufferGeometry().setFromPoints(smoothPts);
    const mat = new THREE.LineBasicMaterial({
      color: highlighted ? '#f0a030' : '#ffffff',
      transparent: true,
      opacity: highlighted ? 0.60 : 0.12,
      depthWrite: false,
    });
    return new THREE.Line(geo, mat);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, highlighted]);

  if (!visible) return null;

  return <primitive object={lineObject} />;
}
