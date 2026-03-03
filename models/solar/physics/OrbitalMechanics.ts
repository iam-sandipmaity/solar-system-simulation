import * as THREE from 'three';
import { DISTANCE_SCALE } from '../data/physicsConstants';

/** Solve Kepler's equation M = E - e*sin(E) using Newton-Raphson iteration */
export function solveKeplersEquation(M: number, e: number, tolerance = 1e-10): number {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 300; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/**
 * Compute the 3-D position of a body on an elliptical orbit.
 *
 * @param semiMajorAxis  km
 * @param eccentricity
 * @param inclination    degrees
 * @param Omega          longitude of ascending node (degrees)
 * @param omega          argument of perihelion (degrees)
 * @param meanAnomaly    radians (increases linearly with time)
 * @returns THREE.Vector3 in visual-scene units
 */
export function getOrbitalPosition(
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  Omega: number,
  omega: number,
  meanAnomaly: number,
): THREE.Vector3 {
  const E = solveKeplersEquation(meanAnomaly, eccentricity);

  // Position in orbital plane
  const xOrbit = semiMajorAxis * (Math.cos(E) - eccentricity);
  const yOrbit = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E);

  // Convert to radians
  const i = (inclination * Math.PI) / 180;
  const O = (Omega * Math.PI) / 180;
  const w = (omega * Math.PI) / 180;

  // Rotate to ecliptic coordinates: Rz(-Ω) · Rx(-i) · Rz(-ω)
  const cosO = Math.cos(O), sinO = Math.sin(O);
  const cosI = Math.cos(i),   sinI = Math.sin(i);
  const cosW = Math.cos(w),   sinW = Math.sin(w);

  const x =
    (cosO * cosW - sinO * sinW * cosI) * xOrbit +
    (-cosO * sinW - sinO * cosW * cosI) * yOrbit;

  const y =
    (sinO * cosW + cosO * sinW * cosI) * xOrbit +
    (-sinO * sinW + cosO * cosW * cosI) * yOrbit;

  const z = sinW * sinI * xOrbit + cosW * sinI * yOrbit;

  // Scale to visual units (swap y/z for Three.js Y-up convention)
  return new THREE.Vector3(x * DISTANCE_SCALE, z * DISTANCE_SCALE, -y * DISTANCE_SCALE);
}

/**
 * Compute the mean anomaly from simulation time.
 *
 * @param orbitalPeriodDays  planet orbital period in days
 * @param simulationDays     elapsed simulation days since J2000 epoch
 * @param initialAngle       starting angle offset (radians)
 */
export function getMeanAnomaly(
  orbitalPeriodDays: number,
  simulationDays: number,
  initialAngle = 0,
): number {
  return ((2 * Math.PI * simulationDays) / orbitalPeriodDays + initialAngle) % (2 * Math.PI);
}

/** Generate sample points for the orbit ellipse in visual space */
export function getOrbitPoints(
  semiMajorAxis: number,
  eccentricity: number,
  inclination: number,
  Omega: number,
  omega: number,
  segments = 256,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const M = (2 * Math.PI * i) / segments;
    points.push(getOrbitalPosition(semiMajorAxis, eccentricity, inclination, Omega, omega, M));
  }
  return points;
}
