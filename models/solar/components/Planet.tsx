'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetData } from '../data/planetData';
import { SIZE_SCALE_EXPONENT, SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS, DISTANCE_SCALE } from '../data/physicsConstants';
import { getOrbitalPosition, getMeanAnomaly } from '../physics/OrbitalMechanics';
import { useTimeStore } from '../physics/TimeScale';
import { useSolarStore } from '../SolarStore';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../shaders/atmosphere';
import { Satellite } from './Satellite';

interface PlanetProps {
  data: PlanetData;
  initialAngleOffset?: number;
  children?: React.ReactNode;
}

function visualRadius(realKm: number): number {
  return Math.max(Math.pow(realKm, SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS);
}

/** Load all of a planet's textures at once with a stable hook call */
function usePlanetTextures(textureDefs: PlanetData['textures']) {
  // Build a stable url array so hooks are called in the same order
  const urls = {
    diffuse:  textureDefs.diffuse  ?? '',
    bump:     textureDefs.bump     ?? '',
    specular: textureDefs.specular ?? '',
    clouds:   textureDefs.clouds   ?? '',
    night:    textureDefs.night    ?? '',
    ring:     textureDefs.ring     ?? '',
  };

  // Load via a single useTexture call with an object map (drei supports this)
  // Drie's useTexture with an object returns the same shape
  const loaded = useTexture(
    Object.fromEntries(
      Object.entries(urls).filter(([, v]) => v !== '')
    ) as Record<string, string>,
  ) as Partial<Record<keyof typeof urls, THREE.Texture>>;

  return {
    diffuse:  textureDefs.diffuse  ? loaded.diffuse  : null,
    bump:     textureDefs.bump     ? loaded.bump     : null,
    specular: textureDefs.specular ? loaded.specular : null,
    clouds:   textureDefs.clouds   ? loaded.clouds   : null,
    night:    textureDefs.night    ? loaded.night    : null,
    ring:     textureDefs.ring     ? loaded.ring     : null,
  };
}

// Atmosphere color per planet
const ATMO_COLORS: Record<string, string> = {
  earth: '#4fa3e0',
  venus: '#e8c072',
  mars:  '#c0533a',
};

export function Planet({ data, initialAngleOffset = 0, children }: PlanetProps) {
  const meshRef    = useRef<THREE.Mesh>(null!);
  const groupRef   = useRef<THREE.Group>(null!);
  const cloudRef   = useRef<THREE.Mesh>(null!);
  const atmoRef    = useRef<THREE.Mesh>(null!);
  const ringRef    = useRef<THREE.Mesh>(null!);

  const [hovered, setHovered] = useState(false);

  const { simulationDays } = useTimeStore();
  const { selectedPlanetId, selectedParentId, setSelectedPlanet, showAtmosphere, showRotation, satelliteFocus, showLabels } = useSolarStore();
  const isSelected       = selectedPlanetId === data.id;
  const isParentOfFocusSat = selectedParentId === data.id;

  const vRadius = visualRadius(data.radius);

  // All textures loaded at once
  const { diffuse, bump, specular, clouds, ring: ringTex } = usePlanetTextures(data.textures);

  // Axial tilt in radians
  const tiltRad = (data.axialTilt * Math.PI) / 180;

  // Atmosphere material
  const atmoMaterial = useMemo(() => {
    const color = ATMO_COLORS[data.id];
    if (!color) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor:     { value: new THREE.Color(color) },
        atmosphereIntensity: { value: data.id === 'venus' ? 2.2 : 1.5 },
        sunDirection:        { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader:   atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending:   THREE.AdditiveBlending,
      side:       THREE.BackSide,
      transparent: true,
      depthWrite:  false,
    });
  }, [data.id]);

  // Ring geometry for Saturn/Uranus
  const ringGeometry = useMemo(() => {
    if (!data.rings || data.id === 'jupiter' || data.id === 'neptune') return null;
    const inner = vRadius * 1.4;
    const outer = data.id === 'saturn' ? vRadius * 2.6 : vRadius * 1.9;
    return new THREE.RingGeometry(inner, outer, 128);
  }, [data.id, data.rings, vRadius]);

  useFrame((_state, delta) => {
    const simDays = useTimeStore.getState().simulationDays;

    if (data.orbitalPeriod > 0) {
      const M = getMeanAnomaly(data.orbitalPeriod, simDays, initialAngleOffset);
      const pos = getOrbitalPosition(
        data.semiMajorAxis,
        data.eccentricity,
        data.inclination,
        data.longitudeOfAscendingNode,
        data.argumentOfPerihelion,
        M,
      );
      if (groupRef.current) groupRef.current.position.copy(pos);
    }

    // Self-rotation — clouds stay in sync with planet surface
    if (showRotation) {
      const rotSpeed = (2 * Math.PI) / (Math.abs(data.rotationPeriod) * 86_400);
      const dir = data.rotationPeriod < 0 ? -1 : 1;
      const rotDelta = dir * rotSpeed * useTimeStore.getState().timeScale * delta * 86_400;
      if (meshRef.current)  meshRef.current.rotation.y  += rotDelta;
      if (cloudRef.current) cloudRef.current.rotation.y += rotDelta * 1.04; // clouds drift slightly faster
    }
  });

  const handleClick = useCallback(() => {
    setSelectedPlanet(isSelected ? null : data.id);
  }, [data.id, isSelected, setSelectedPlanet]);

  // Ring UV fix
  useMemo(() => {
    if (!ringGeometry) return;
    const pos = ringGeometry.attributes.position;
    const uv  = ringGeometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const radius = Math.sqrt(x * x + z * z);
      const innerR = vRadius * 1.4;
      const outerR = data.id === 'saturn' ? vRadius * 2.6 : vRadius * 1.9;
      uv.setXY(i, (radius - innerR) / (outerR - innerR), 0);
    }
    uv.needsUpdate = true;
  }, [ringGeometry, data.id, vRadius]);

  return (
    <group ref={groupRef}>
      {/* Axial tilt wrapper */}
      <group rotation={[tiltRad, 0, 0]}>
        {/* Main planet sphere */}
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[vRadius, 64, 64]} />
          <meshStandardMaterial
            map={diffuse ?? undefined}
            bumpMap={bump ?? undefined}
            bumpScale={0.005}
            metalnessMap={specular ?? undefined}
            roughness={data.type === 'gas-giant' || data.type === 'ice-giant' ? 0.8 : 0.9}
            metalness={0.05}
            color={diffuse ? undefined : data.color}
          />
        </mesh>

        {/* Cloud layer */}
        {clouds && (
          <mesh ref={cloudRef}>
            <sphereGeometry args={[vRadius * 1.008, 64, 64]} />
            <meshStandardMaterial
              map={clouds}
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Atmosphere glow */}
        {atmoMaterial && showAtmosphere && (
          <mesh ref={atmoRef} material={atmoMaterial}>
            <sphereGeometry args={[vRadius * 1.06, 32, 32]} />
          </mesh>
        )}

        {/* Saturn / Uranus rings */}
        {ringGeometry && (
          <mesh
            ref={ringRef}
            geometry={ringGeometry}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <meshStandardMaterial
              map={ringTex ?? undefined}
              color={ringTex ? undefined : '#c8b89a'}
              side={THREE.DoubleSide}
              transparent
              opacity={ringTex ? 1 : 0.6}
              alphaMap={ringTex ?? undefined}
            />
          </mesh>
        )}
      </group>

      {/* Satellites — hidden for non-selected planets when satelliteFocus is on.
           Also keeps satellites visible when a satellite of this planet is focused. */}
      {(!satelliteFocus || isSelected || isParentOfFocusSat) && data.satelliteData?.map((moon) => (
        <Satellite key={moon.name} data={moon} parentId={data.id} />
      ))}

      {/* Additional child bodies passed explicitly */}
      {children}

      {/* Hover / selection label — scales with camera distance, always above planet */}
      {showLabels && (hovered || isSelected) && (
        <Html
          position={[0, 0, 0]}
          zIndexRange={[100, 0]}
        >
          <div
            style={{
              position: 'absolute',
              transform: 'translate(-50%, calc(-100% - 2px))',
              background: 'rgba(0,0,0,0.55)',
              border: `1px solid ${isSelected ? '#f0a030' : '#666'}`,
              color: '#fff',
              padding: '2px 10px',
              borderRadius: 4,
              fontSize: 15,
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              letterSpacing: '0.04em',
            }}
          >
            {data.name}
          </div>
        </Html>
      )}
    </group>
  );
}
