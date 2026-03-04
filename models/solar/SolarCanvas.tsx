'use client';

import { Canvas } from '@react-three/fiber';
import { SolarSystem } from './SolarSystem';
import * as THREE from 'three';

export default function SolarCanvas({ onAsteroidsReady }: { onAsteroidsReady?: () => void }) {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [0, 35, 80], fov: 55, near: 0.01, far: 80000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      shadows
    >
      <SolarSystem onAsteroidsReady={onAsteroidsReady} />
    </Canvas>
  );
}
