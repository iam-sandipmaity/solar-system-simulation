'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useCallback } from 'react';
import { PlanetSelector } from '@/models/solar/controls/PlanetSelector';
import { InfoPanel } from '@/models/solar/ui/InfoPanel';
import { HUD } from '@/models/solar/ui/HUD';
import { Settings } from '@/models/solar/ui/Settings';
import { WelcomeModal } from '@/models/solar/ui/WelcomeModal';

// Dynamically import the Canvas to avoid SSR issues
const SolarCanvas = dynamic(() => import('@/models/solar/SolarCanvas'), { ssr: false });

export default function SolarPage() {
  const [launched, setLaunched] = useState(false);
  const [asteroidsReady, setAsteroidsReady] = useState(false);
  const handleLaunched = useCallback(() => setLaunched(true), []);
  const handleAsteroidsReady = useCallback(() => setAsteroidsReady(true), []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* Welcome modal — gates the canvas until user launches */}
      {!launched && <WelcomeModal onLaunched={handleLaunched} asteroidsReady={asteroidsReady} />}

      {/* Three.js Canvas — pre-load in background once modal opens */}
      <Suspense fallback={null}>
        <SolarCanvas onAsteroidsReady={handleAsteroidsReady} />
      </Suspense>

      {/* UI Overlays — only visible after launch */}
      {launched && <HUD />}
      {launched && <Settings />}
      {launched && <PlanetSelector />}
      {launched && <InfoPanel />}

      {/* Copyright */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'rgba(255,255,255,0.28)',
        fontSize: 11,
        fontFamily: 'inherit',
        letterSpacing: '0.04em',
        userSelect: 'none',
        zIndex: 10,
        whiteSpace: 'nowrap',
      }}>
        <span>© {new Date().getFullYear()} Sandip Maity</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <a
          href="https://sandipmaity.me"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
        >
          sandipmaity.me
        </a>
        <span style={{ opacity: 0.4 }}>·</span>
        <a
          href="https://github.com/iam-sandipmaity/solar-system-simulation"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.38)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
              -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
              .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
              -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27
              .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
              .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
              0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
      </div>
    </div>
  );
}
