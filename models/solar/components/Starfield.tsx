'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function Starfield() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useTexture('/textures/2k_stars_milky_way.jpg');
  const { camera } = useThree();

  // Pin the skybox to the camera every frame so it's always at "infinity"
  useFrame(() => {
    if (meshRef.current) meshRef.current.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <sphereGeometry args={[900, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
