'use client';

import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSolarStore } from '../SolarStore';
import { PLANETS, DWARF_PLANETS } from '../data/planetData';
import { getOrbitalPosition, getMeanAnomaly } from '../physics/OrbitalMechanics';
import { useTimeStore } from '../physics/TimeScale';
import { DISTANCE_SCALE, SIZE_SCALE_EXPONENT, SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS } from '../data/physicsConstants';
import { SAT_ORBIT_BOOST, SAT_MIN_ORBIT_VIS } from '../components/Satellite';

const INITIAL_ANGLES: Record<string, number> = {};
PLANETS.forEach((p, i) => { INITIAL_ANGLES[p.id] = (i / PLANETS.length) * 2 * Math.PI; });
DWARF_PLANETS.forEach((p, i) => { INITIAL_ANGLES[p.id] = (i / DWARF_PLANETS.length) * 2 * Math.PI + 0.3; });

const VIEW_DIRS: Record<string, THREE.Vector3> = {
  angle: new THREE.Vector3(1, 1, 1).normalize(),
  top:   new THREE.Vector3(0.001, 1, 0.001).normalize(),
  side:  new THREE.Vector3(1, 0.001, 0.001).normalize(),
  front: new THREE.Vector3(0.001, 0.001, 1).normalize(),
};

export function CameraController() {
  const controlsRef    = useRef<any>(null!);
  const { camera }     = useThree();
  const { selectedPlanetId, selectedParentId, selectedSatelliteId,
          cameraView, focusMode, setCameraView } = useSolarStore();

  const prevSelKey     = useRef<string | null>(null);
  const prevView       = useRef<string>('angle');
  const targetDist     = useRef<number | null>(null);
  const pendingViewDir = useRef<THREE.Vector3 | null>(null);
  // Offset from target preserved in free+focus mode
  const freeOffset     = useRef<THREE.Vector3 | null>(null);
  const userDragging   = useRef(false);

  // When user starts manually orbiting → switch to free view
  const handleStart = useCallback(() => {
    userDragging.current = true;
    pendingViewDir.current = null;          // cancel any in-progress snap
    freeOffset.current = null;              // will be resampled after drag
    if (useSolarStore.getState().cameraView !== 'free') {
      setCameraView('free');
    }
  }, [setCameraView]);

  const handleEnd = useCallback(() => {
    userDragging.current = false;
  }, []);

  useFrame(() => {
    const { simulationDays } = useTimeStore.getState();
    const selKey = selectedSatelliteId
      ? `${selectedParentId}:${selectedSatelliteId}`
      : selectedPlanetId ?? null;

    // ── New selection → trigger zoom-in & reset free offset ───────────────
    if (selKey !== prevSelKey.current) {
      prevSelKey.current = selKey;
      freeOffset.current = null;
      if (selectedSatelliteId && selectedParentId) {
        const planet = PLANETS.find((p) => p.id === selectedParentId);
        const moon   = planet?.satelliteData?.find((s) => s.name === selectedSatelliteId);
        if (moon) {
          const vr = Math.max(Math.pow(Math.max(moon.radius, 1), SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR * 1.5, MIN_VISUAL_RADIUS);
          targetDist.current = vr * 10;
        }
      } else if (selectedPlanetId === 'sun' || selectedPlanetId === null) {
        // Return to Sun / deselect → zoom out to inner-system overview
        targetDist.current = 150;
      } else if (selectedPlanetId) {
        const body = PLANETS.find((p) => p.id === selectedPlanetId)
          ?? DWARF_PLANETS.find((p) => p.id === selectedPlanetId);
        if (body) {
          const vr = Math.max(Math.pow(body.radius, SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS);
          targetDist.current = Math.max(vr * 5, 0.08);
        }
      }
    }

    // ── View preset changed → animate to that direction ───────────────────
    if (cameraView !== prevView.current) {
      prevView.current = cameraView;
      if (cameraView !== 'free') {
        pendingViewDir.current = VIEW_DIRS[cameraView]?.clone() ?? null;
        freeOffset.current = null;
      }
    }

    if (pendingViewDir.current && controlsRef.current) {
      const tgt  = controlsRef.current.target as THREE.Vector3;
      const dist = camera.position.distanceTo(tgt);
      const desired = tgt.clone().add(pendingViewDir.current.clone().multiplyScalar(dist));
      camera.position.lerp(desired, 0.08);
      if (camera.position.distanceTo(desired) < 0.002 * dist) pendingViewDir.current = null;
      controlsRef.current.update();
    }

    // ── Zoom to desired distance ───────────────────────────────────────────
    if (targetDist.current !== null && controlsRef.current) {
      const tgt     = controlsRef.current.target as THREE.Vector3;
      const dir     = camera.position.clone().sub(tgt);
      const curDist = dir.length();
      if (curDist > 0.0001) {
        const newDist = curDist + (targetDist.current - curDist) * 0.06;
        camera.position.copy(tgt.clone().add(dir.normalize().multiplyScalar(newDist)));
        if (Math.abs(newDist - targetDist.current) < 0.002) targetDist.current = null;
      }
    }

    if (!focusMode) return;

    // ── Compute target world position ─────────────────────────────────────
    let targetWorldPos: THREE.Vector3 | null = null;

    if (selectedParentId && selectedSatelliteId) {
      const planet = [...PLANETS, ...DWARF_PLANETS].find((p) => p.id === selectedParentId);
      if (!planet) return;
      const M_planet  = getMeanAnomaly(planet.orbitalPeriod, simulationDays, INITIAL_ANGLES[planet.id] ?? 0);
      const planetPos = getOrbitalPosition(planet.semiMajorAxis, planet.eccentricity, planet.inclination,
        planet.longitudeOfAscendingNode, planet.argumentOfPerihelion, M_planet);
      const moon = planet.satelliteData?.find((s) => s.name === selectedSatelliteId);
      if (!moon) return;
      const absPeriod = Math.abs(moon.orbitalPeriod);
      const dir2      = moon.orbitalPeriod < 0 ? -1 : 1;
      const orbitVis  = Math.max(moon.orbitRadius * DISTANCE_SCALE * SAT_ORBIT_BOOST, SAT_MIN_ORBIT_VIS);
      const M_moon    = (2 * Math.PI * simulationDays) / absPeriod;
      targetWorldPos  = new THREE.Vector3().addVectors(planetPos,
        new THREE.Vector3(Math.cos(M_moon * dir2) * orbitVis, 0, Math.sin(M_moon * dir2) * orbitVis));
    } else if (selectedPlanetId === 'sun' || selectedPlanetId === null) {
      // Sun selected or nothing selected → orbit centre returns to origin (Sun)
      targetWorldPos = new THREE.Vector3(0, 0, 0);
    } else {
      const planet = [...PLANETS, ...DWARF_PLANETS].find((p) => p.id === selectedPlanetId);
      if (!planet) return;
      const M = getMeanAnomaly(planet.orbitalPeriod, simulationDays, INITIAL_ANGLES[planet.id] ?? 0);
      targetWorldPos = getOrbitalPosition(planet.semiMajorAxis, planet.eccentricity, planet.inclination,
        planet.longitudeOfAscendingNode, planet.argumentOfPerihelion, M);
    }

    if (!targetWorldPos || !controlsRef.current) return;

    const ctrlTarget = controlsRef.current.target as THREE.Vector3;

    if (cameraView === 'free') {
      // ── Free + Focus: preserve camera offset, translate both together ──
      // Sample offset once (or after user finishes dragging)
      if (freeOffset.current === null && !userDragging.current) {
        freeOffset.current = camera.position.clone().sub(ctrlTarget);
      }
      if (freeOffset.current) {
        const newTarget = ctrlTarget.clone().lerp(targetWorldPos, 0.05);
        const delta = newTarget.clone().sub(ctrlTarget);
        ctrlTarget.copy(newTarget);
        camera.position.add(delta); // move camera by same amount → angle preserved
        controlsRef.current.update();
      }
    } else {
      // ── Preset + Focus: lerp target only, angle is controlled by preset ─
      ctrlTarget.lerp(targetWorldPos, 0.05);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.5}
      zoomSpeed={1.2}
      panSpeed={0.8}
      minDistance={0.05}
      maxDistance={15000}
      makeDefault
      onStart={handleStart}
      onEnd={handleEnd}
    />
  );
}

