'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MOON_DATA } from '../data/planetData';
import { DISTANCE_SCALE, SIZE_SCALE_EXPONENT, SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS } from '../data/physicsConstants';
import { useTimeStore } from '../physics/TimeScale';
import { useSolarStore } from '../SolarStore';

const MOON_VISUAL_RADIUS = Math.max(
  Math.pow(MOON_DATA.radius, SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR,
  MIN_VISUAL_RADIUS,
);
const MOON_ORBIT_VIS = MOON_DATA.orbitRadius * DISTANCE_SCALE * 12; // boosted for visibility
const MOON_INC_RAD   = (MOON_DATA.orbitalInclination ?? 0) * (Math.PI / 180);

export function Moon() {
  const moonRef  = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const texture  = useTexture('/textures/2k_moon.jpg');
  const { showRotation } = useSolarStore();

  useFrame((_state, delta) => {
    const { simulationDays, timeScale } = useTimeStore.getState();
    const M = (2 * Math.PI * simulationDays) / MOON_DATA.orbitalPeriod;
    const x = Math.cos(M) * MOON_ORBIT_VIS;
    const z = Math.sin(M) * MOON_ORBIT_VIS;
    if (groupRef.current) groupRef.current.position.set(x, 0, z);
    // Tidally locked — rotation period equals orbital period
    if (showRotation && moonRef.current) {
      const rotSpeed = (2 * Math.PI) / (MOON_DATA.orbitalPeriod * 86_400);
      moonRef.current.rotation.y += rotSpeed * timeScale * delta * 86_400;
    }
  });

  return (
    <group rotation={[MOON_INC_RAD, 0, 0]}>
    <group ref={groupRef}>
      <mesh ref={moonRef} castShadow receiveShadow>
        <sphereGeometry args={[MOON_VISUAL_RADIUS, 32, 32]} />
        <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
      </mesh>
    </group>
    </group>
  );
}
