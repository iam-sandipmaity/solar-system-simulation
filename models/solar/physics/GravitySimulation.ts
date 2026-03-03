/**
 * N-body gravitational simulation (optional advanced mode).
 * Uses Velocity Verlet integration for numerical stability.
 */
import * as THREE from 'three';
import { G } from '../data/physicsConstants';

export interface Body {
  id: string;
  mass: number;       // kg
  position: THREE.Vector3;  // m
  velocity: THREE.Vector3;  // m/s
  acceleration: THREE.Vector3;
}

/** Compute pairwise gravitational accelerations for all bodies */
function computeAccelerations(bodies: Body[]): void {
  // Reset accelerations
  for (const b of bodies) b.acceleration.set(0, 0, 0);

  const delta = new THREE.Vector3();
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      delta.subVectors(bodies[j].position, bodies[i].position);
      const distSq = Math.max(delta.lengthSq(), 1e12); // softening
      const dist   = Math.sqrt(distSq);
      const force  = G / distSq;

      // a_i += G * m_j / d² * dir
      bodies[i].acceleration.addScaledVector(delta, (force * bodies[j].mass) / dist);
      // a_j -= G * m_i / d² * dir
      bodies[j].acceleration.addScaledVector(delta, -(force * bodies[i].mass) / dist);
    }
  }
}

/** Advance simulation by dt seconds using Velocity Verlet */
export function stepSimulation(bodies: Body[], dt: number): void {
  // Half-step velocity update: v += 0.5 * a * dt
  for (const b of bodies) {
    b.velocity.addScaledVector(b.acceleration, 0.5 * dt);
    b.position.addScaledVector(b.velocity, dt);
  }

  computeAccelerations(bodies);

  // Second half-step
  for (const b of bodies) {
    b.velocity.addScaledVector(b.acceleration, 0.5 * dt);
  }
}
