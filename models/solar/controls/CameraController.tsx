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
  const freeOffset     = useRef<THREE.Vector3 | null>(null);
  const userDragging   = useRef(false);
  // True only if the pointer actually MOVED while the button was held.
  // A bare click (mousedown → no move → mouseup) must NOT switch to free mode.
  const hasMoved       = useRef(false);

  const handleStart = useCallback(() => {
    userDragging.current = true;
    hasMoved.current     = false;          // reset move-flag on every new press
    pendingViewDir.current = null;
  }, []);

  // Fires only when OrbitControls actually changes the camera (i.e. real drag)
  const handleChange = useCallback(() => {
    if (!hasMoved.current) {
      hasMoved.current = true;             // first real movement detected
      pendingViewDir.current = null;
      if (useSolarStore.getState().cameraView !== 'free') {
        setCameraView('free');
      }
    }
  }, [setCameraView]);

  const handleEnd = useCallback(() => {
    userDragging.current = false;
    if (hasMoved.current) {
      // Real drag ended — re-latch offset from the exact angle the user chose
      freeOffset.current = null;
    }
    // If hasMoved is false it was just a click — don't touch view or offset
  }, []);

  useFrame(() => {
    const { simulationDays } = useTimeStore.getState();
    const selKey = selectedSatelliteId
      ? `${selectedParentId}:${selectedSatelliteId}`
      : selectedPlanetId ?? null;

    // ── New selection → always reset to angle+zoom for a clean focus ─────
    if (selKey !== prevSelKey.current) {
      prevSelKey.current = selKey;
      freeOffset.current = null;
      // Always return to angle preset so the zoom-to-fit is visible regardless
      // of what view mode the user was in (fixes the free-mode click bug).
      setCameraView('angle');

      // Immediately snap OrbitControls target to the body's current world
      // position so the zoom animation and view-dir animation both start from
      // the correct pivot. Without this, on first selection the target is still
      // at [0,0,0] (Sun) and the camera briefly drifts there before correcting.
      if (controlsRef.current) {
        const { simulationDays: sd } = useTimeStore.getState();
        let snapPos: THREE.Vector3 | null = null;
        if (selectedSatelliteId && selectedParentId) {
          const planet = [...PLANETS, ...DWARF_PLANETS].find((p) => p.id === selectedParentId);
          if (planet) {
            const Mp = getMeanAnomaly(planet.orbitalPeriod, sd, INITIAL_ANGLES[planet.id] ?? 0);
            const planetPos = getOrbitalPosition(planet.semiMajorAxis, planet.eccentricity,
              planet.inclination, planet.longitudeOfAscendingNode, planet.argumentOfPerihelion, Mp);
            const moon = planet.satelliteData?.find((s) => s.name === selectedSatelliteId);
            if (moon) {
              const absPeriod = Math.abs(moon.orbitalPeriod);
              const dir2      = moon.orbitalPeriod < 0 ? -1 : 1;
              const orbitVis  = Math.max(moon.orbitRadius * DISTANCE_SCALE * SAT_ORBIT_BOOST, SAT_MIN_ORBIT_VIS);
              const M_moon    = (2 * Math.PI * sd) / absPeriod;
              const incRad    = ((moon.orbitalInclination ?? 0) * Math.PI) / 180;
              const moonOffset = new THREE.Vector3(
                Math.cos(M_moon * dir2) * orbitVis,
                -Math.sin(M_moon * dir2) * orbitVis * Math.sin(incRad),
                 Math.sin(M_moon * dir2) * orbitVis * Math.cos(incRad),
              );
              snapPos = planetPos.clone().add(moonOffset);
            }
          }
        } else if (selectedPlanetId === 'sun' || selectedPlanetId === null) {
          snapPos = new THREE.Vector3(0, 0, 0);
        } else if (selectedPlanetId) {
          const body = [...PLANETS, ...DWARF_PLANETS].find((p) => p.id === selectedPlanetId);
          if (body) {
            const M = getMeanAnomaly(body.orbitalPeriod, sd, INITIAL_ANGLES[body.id] ?? 0);
            snapPos = getOrbitalPosition(body.semiMajorAxis, body.eccentricity,
              body.inclination, body.longitudeOfAscendingNode, body.argumentOfPerihelion, M);
          }
        }
        if (snapPos) {
          (controlsRef.current.target as THREE.Vector3).copy(snapPos);
          controlsRef.current.update();
        }
      }

      if (selectedSatelliteId && selectedParentId) {
        const planet = [...PLANETS, ...DWARF_PLANETS].find((p) => p.id === selectedParentId);
        const moon   = planet?.satelliteData?.find((s) => s.name === selectedSatelliteId);
        if (moon) {
          const vr = Math.max(Math.pow(Math.max(moon.radius, 1), SIZE_SCALE_EXPONENT) * SIZE_SCALE_FACTOR, MIN_VISUAL_RADIUS);
          targetDist.current = vr * 6;
        }
      } else if (selectedPlanetId === 'sun' || selectedPlanetId === null) {
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
      const incRad    = ((moon.orbitalInclination ?? 0) * Math.PI) / 180;
      const moonRelX  = Math.cos(M_moon * dir2) * orbitVis;
      const moonRelZ  = Math.sin(M_moon * dir2) * orbitVis;
      const moonOffset = new THREE.Vector3(
        moonRelX,
        -moonRelZ * Math.sin(incRad),
         moonRelZ * Math.cos(incRad),
      );
      targetWorldPos = planetPos.clone().add(moonOffset);
    } else if (selectedPlanetId === 'sun' || selectedPlanetId === null) {
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
      // ── Free + Focus ───────────────────────────────────────────────────
      // While a zoom animation is running (targetDist != null) let the zoom
      // block do its job. Don't latch freeOffset yet — it would capture the
      // current far-away position and immediately drive the camera back there.
      if (targetDist.current !== null) return;

      // While dragging: OrbitControls owns the camera position.
      // Keep ctrlTarget chasing the body so the pivot stays correct.
      if (userDragging.current) {
        const dist2 = ctrlTarget.distanceTo(targetWorldPos);
        const alpha = dist2 > 1 ? 0.18 : 0.08;
        ctrlTarget.lerp(targetWorldPos, alpha);
        controlsRef.current.update();
        return;
      }

      // Latch offset once after zoom is done and drag has ended.
      // Offset is from the ACTUAL body position so there is no stutter.
      if (freeOffset.current === null) {
        freeOffset.current = camera.position.clone().sub(targetWorldPos);
      }

      // Translate both camera and target by the same delta so the locked
      // viewing angle is preserved as the body moves.
      const desiredCamPos = targetWorldPos.clone().add(freeOffset.current);
      const catchAlpha    = 0.15;
      camera.position.lerp(desiredCamPos, catchAlpha);
      ctrlTarget.lerp(targetWorldPos, catchAlpha);
      controlsRef.current.update();
    } else {
      // ── Preset + Focus: lerp target only, angle controlled by preset ───
      const dist2Target = ctrlTarget.distanceTo(targetWorldPos);
      const lerpAlpha = dist2Target > 1 ? 0.12 : 0.05;
      ctrlTarget.lerp(targetWorldPos, lerpAlpha);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.7}
      zoomSpeed={1.4}
      panSpeed={0.9}
      minDistance={0.005}
      maxDistance={15000}
      makeDefault
      onStart={handleStart}
      onChange={handleChange}
      onEnd={handleEnd}
    />
  );
}

