'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useTimeStore } from '../physics/TimeScale';
import { DISTANCE_SCALE, AU_KM } from '../data/physicsConstants';

// ── Belt boundaries (Wikipedia / NASA confirmed) ──────────────────────────────
// Inner boundary: 2.06 AU — 4:1 Kirkwood gap with Jupiter
// Outer boundary: 3.27 AU — 2:1 Kirkwood gap with Jupiter
// Mars semiMajorAxis:    1.524 AU = 227.9 visual units
// Jupiter semiMajorAxis: 5.203 AU = 778.6 visual units
const AU_VISUAL   = AU_KM * DISTANCE_SCALE;                    // ~149.598
const BELT_INNER  = parseFloat((2.06 * AU_VISUAL).toFixed(2)); // ~308.2
const BELT_OUTER  = parseFloat((3.27 * AU_VISUAL).toFixed(2)); // ~489.2
const BELT_HEIGHT = 10;    // vertical scatter ± 5 units (real belt inclination < 30°)

const PARTICLE_COUNT = 5_000;
const ROCK_COUNT     = 150;

// ── Helper ────────────────────────────────────────────────────────────────────
function randomBeltPoint() {
  const angle = Math.random() * Math.PI * 2;
  const r     = BELT_INNER + Math.random() * (BELT_OUTER - BELT_INNER);
  const y     = (Math.random() - 0.5) * BELT_HEIGHT;
  return { x: Math.cos(angle) * r, y, z: Math.sin(angle) * r, r, angle };
}

function keplerOrbitSpeed(r_visual: number) {
  // Period_days = 365.25 × a_AU^1.5   (Kepler's 3rd law, 1 AU = AU_VISUAL units)
  const aAU       = r_visual / AU_VISUAL;
  const periodDays = 365.25 * Math.pow(aAU, 1.5);
  return (2 * Math.PI) / periodDays; // rad / simulated day
}

// ── Rock state type ───────────────────────────────────────────────────────────
type RockState = {
  r: number; y: number;
  angle: number;
  rotX: number; rotY: number; rotZ: number;
  scale: number;
  orbitSpeed: number; // rad / simulated day
  spinSpeed: number;  // rad / real second
};

// ── Component ─────────────────────────────────────────────────────────────────
export function AsteroidBelt({ visible = true }: { visible?: boolean }) {
  const rockTexture = useLoader(TextureLoader, '/textures/Rock035.jpg');

  // ── Dust particle cloud ──────────────────────────────────────────────────
  const particleGeo = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = randomBeltPoint();
      positions[i * 3]     = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // ── Instanced rock states ─────────────────────────────────────────────────
  const rockStates = useMemo<RockState[]>(() =>
    Array.from({ length: ROCK_COUNT }, () => {
      const p = randomBeltPoint();
      return {
        r:          p.r,
        y:          p.y,
        angle:      p.angle,
        rotX:       Math.random() * Math.PI * 2,
        rotY:       Math.random() * Math.PI * 2,
        rotZ:       Math.random() * Math.PI * 2,
        scale:      0.25 + Math.random() * 1.0,
        orbitSpeed: keplerOrbitSpeed(p.r),
        spinSpeed:  0.3 + Math.random() * 1.5,
      };
    }),
  []);

  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy   = useMemo(() => new THREE.Object3D(), []);

  // Set initial transforms once mesh ref is available
  useEffect(() => {
    if (!meshRef.current) return;
    rockStates.forEach((s, i) => {
      dummy.position.set(Math.cos(s.angle) * s.r, s.y, Math.sin(s.angle) * s.r);
      dummy.rotation.set(s.rotX, s.rotY, s.rotZ);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [rockStates, dummy]);

  // Animate: orbit (time-scaled) + spin (real-time)
  useFrame((_, delta) => {
    if (!meshRef.current || !visible) return;
    const timeScale = useTimeStore.getState().timeScale;
    const dtDays    = delta * timeScale / 86_400; // real seconds → simulated days

    rockStates.forEach((s, i) => {
      s.angle += s.orbitSpeed * dtDays; // Keplerian orbit
      s.rotY  += s.spinSpeed  * delta;  // slow self-rotation

      dummy.position.set(Math.cos(s.angle) * s.r, s.y, Math.sin(s.angle) * s.r);
      dummy.rotation.set(s.rotX, s.rotY, s.rotZ);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <group>
      {/* ── Dust / particle haze ────────────────────────────────────────── */}
      <points geometry={particleGeo}>
        <pointsMaterial
          size={0.55}
          color="#b09878"
          transparent
          opacity={0.28}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* ── Instanced rock meshes ──────────────────────────────────────── */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, ROCK_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.96}
          metalness={0.02}
          color="#9a8a78"
        />
      </instancedMesh>
    </group>
  );
}
