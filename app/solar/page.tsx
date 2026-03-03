'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { PlanetSelector } from '@/models/solar/controls/PlanetSelector';
import { InfoPanel } from '@/models/solar/ui/InfoPanel';
import { HUD } from '@/models/solar/ui/HUD';
import { Settings } from '@/models/solar/ui/Settings';

// Dynamically import the Canvas to avoid SSR issues
const SolarCanvas = dynamic(() => import('@/models/solar/SolarCanvas'), { ssr: false });

export default function SolarPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* Three.js Canvas */}
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', fontFamily: 'inherit' }}>
          <div style={{ textAlign: 'center' }}>
            <div>Loading Solar System…</div>
          </div>
        </div>
      }>
        <SolarCanvas />
      </Suspense>

      {/* UI Overlays */}
      <HUD />
      <Settings />
      <PlanetSelector />
      <InfoPanel />
    </div>
  );
}
