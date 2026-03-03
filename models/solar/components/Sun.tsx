'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SUN } from '../data/planetData';
import { SIZE_SCALE_EXPONENT, SIZE_SCALE_FACTOR } from '../data/physicsConstants';
import { useSolarStore } from '../SolarStore';
import { sunCoronaVertexShader, sunCoronaFragmentShader } from '../shaders/sunCorona';

// With linear scaling (EXP=1, FACTOR=5e-6) Sun.radius * 5e-6 = ~3.48, giving a perfect 109x Earth ratio.
const SUN_VISUAL_RADIUS = Math.pow(SUN.radius, SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR;

export function Sun() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const coronaRef = useRef<THREE.Mesh>(null!);
  const { showAtmosphere } = useSolarStore();
  const texture = useTexture(SUN.textures.diffuse!);

  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          glowColor: { value: new THREE.Color('#FDB813') },
        },
        vertexShader: sunCoronaVertexShader,
        fragmentShader: sunCoronaFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005;
    }
    coronaMaterial.uniforms.time.value = clock.getElapsedTime();
  });

  return (
    <group>
      {/* Sun sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          emissive={new THREE.Color('#FDB813')}
          emissiveMap={texture}
          emissiveIntensity={1.2}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Corona glow shell */}
      {showAtmosphere && <mesh ref={coronaRef} material={coronaMaterial}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS * 1.3, 32, 32]} />
      </mesh>}


      {/* Point light — decay=0 so all planets receive sunlight regardless of scale distance */}
      <pointLight color="#FFF5E4" intensity={3.5} distance={0} decay={0} castShadow shadow-mapSize={[2048, 2048]} />

      {/* Ambient fill — enough to see textures on the night side */}
      <ambientLight intensity={0.18} color="#c8d8ff" />
    </group>
  );
}
