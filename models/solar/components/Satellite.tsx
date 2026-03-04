'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MoonData } from '../data/planetData';
import { DISTANCE_SCALE, SIZE_SCALE_EXPONENT, SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS } from '../data/physicsConstants';
import { useTimeStore } from '../physics/TimeScale';
import { useSolarStore } from '../SolarStore';

// Exported so CameraController can reuse identical math
export const SAT_ORBIT_BOOST = 15;
export const SAT_MIN_ORBIT_VIS = 0.18;

interface SatelliteProps {
  data: MoonData;
  parentId: string;
}

export function Satellite({ data, parentId }: SatelliteProps) {
  const meshRef  = useRef<THREE.Mesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  const { showRotation, showSatelliteOrbits, hideSiblingOrbits, selectedSatelliteId, selectedParentId, setSelectedSatellite, highlightFocusOrbit, showLabels } = useSolarStore();
  const isSelected = selectedSatelliteId === data.name && selectedParentId === parentId;

  const visualRad = Math.max(
    Math.pow(Math.max(data.radius, 1), SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR,
    MIN_VISUAL_RADIUS,
  );

  const orbitVis = Math.max(
    data.orbitRadius * DISTANCE_SCALE * SAT_ORBIT_BOOST,
    SAT_MIN_ORBIT_VIS,
  );

  const retrograde = data.orbitalPeriod < 0;
  const absPeriod  = Math.abs(data.orbitalPeriod);
  const dir        = retrograde ? -1 : 1;
  const incRad     = (data.orbitalInclination ?? 0) * (Math.PI / 180);

  const textureUrl = `/textures/2k_${data.textureKey ?? 'moon'}.jpg`;
  const texture    = useTexture(textureUrl);

  // Orbit ring — geometry memoised on orbit size, material kept in a ref so
  // color/opacity can be updated reactively without recreating geometry.
  const orbitMatRef = useRef(new THREE.LineBasicMaterial({
    color: '#6688cc', opacity: 0.35, transparent: true, depthWrite: false,
  }));
  const orbitLine = useMemo(() => {
    // 720 segments = one point every 0.5° — smooth at any zoom level
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 720; i++) {
      const a = (i / 720) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * orbitVis, 0, Math.sin(a) * orbitVis));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geo, orbitMatRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orbitVis]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    setSelectedSatellite(parentId, data.name);
  }, [parentId, data.name, setSelectedSatellite]);

  useFrame((_state, delta) => {
    const { simulationDays, timeScale } = useTimeStore.getState();

    const M = (2 * Math.PI * simulationDays) / absPeriod;
    const x = Math.cos(M * dir) * orbitVis;
    const z = Math.sin(M * dir) * orbitVis;
    if (groupRef.current) groupRef.current.position.set(x, 0, z);

    if (showRotation && meshRef.current) {
      const rotSpeed = (2 * Math.PI) / (absPeriod * 86_400);
      meshRef.current.rotation.y += dir * rotSpeed * timeScale * delta * 86_400;
    }

    // Highlight orbit ring when this satellite is focused
    const highlighted = isSelected && highlightFocusOrbit;
    orbitMatRef.current.color.set(highlighted ? '#f0a030' : '#6688cc');
    orbitMatRef.current.opacity = highlighted ? 0.75 : 0.35;
  });

  return (
    <group rotation={[incRad, 0, 0]}>
      {/* Orbit ring — hidden for siblings when hideSiblingOrbits is on and another sat is focused */}
      {showSatelliteOrbits &&
        !(hideSiblingOrbits && selectedSatelliteId !== null && selectedParentId === parentId && !isSelected) &&
        <primitive object={orbitLine} />}

      <group ref={groupRef}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[visualRad, 24, 24]} />
        <meshStandardMaterial
          map={data.textureKey ? texture : undefined}
          color={isSelected ? '#ffe8a0' : hovered ? '#ddd' : data.color}
          roughness={0.9}
          metalness={0}
          emissive={isSelected ? new THREE.Color('#604010') : undefined}
          emissiveIntensity={isSelected ? 0.35 : 0}
        />
      </mesh>

      {/* Label shown on hover or selection */}
      {showLabels && (hovered || isSelected) && (
        <Html
          position={[0, 0, 0]}
          zIndexRange={[100, 0]}
        >
          <div style={{
            position: 'absolute',
            transform: 'translate(-50%, calc(-100% - 2px))',
            background: 'rgba(0,0,0,0.60)',
            border: `1px solid ${isSelected ? '#f0a030' : '#555'}`,
            color: '#ddd',
            padding: '2px 10px',
            borderRadius: 4,
            fontSize: 15,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {data.name}
          </div>
        </Html>
      )}
    </group>
    </group>
  );
}
