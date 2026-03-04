'use client';

/**
 * SpecificAsteroids.tsx
 *
 * Renders individually-tracked asteroids whose XYZ trajectories come from
 * NASA Horizons ephemeris data (pre-processed to specific-asteroids.bin).
 *
 * Performance design:
 *  - Binary parsed in a microtask batch (yields to browser between chunks)
 *  - Positions only recomputed every POSITION_UPDATE_EVERY frames
 *  - Selected asteroid always updated every frame for smooth tracking
 *  - Trail uses a reused scratch Vector3 (no per-frame allocations)
 *  - Index look-up via Map<name, index> â€” O(1)
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSolarStore } from '../SolarStore';
import { useTimeStore } from '../physics/TimeScale';
import { AU_KM, DISTANCE_SCALE } from '../data/physicsConstants';

const AU_VIS = AU_KM * DISTANCE_SCALE;

// â”€â”€ Public exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const asteroidPositions = new Map<string, THREE.Vector3>();

export interface AsteroidInfo {
  name:        string;
  distAU:      number;
  sampleCount: number;
  jdFirst:     number;
  jdLast:      number;
}
export const asteroidInfoMap = new Map<string, AsteroidInfo>();

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AsteroidData {
  name:      string;
  jdOffsets: Float32Array;
  xs:        Float32Array;
  ys:        Float32Array;
  zs:        Float32Array;
}

// â”€â”€ Interpolator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function interpolatePosition(a: AsteroidData, simDays: number, out: THREE.Vector3) {
  const { jdOffsets, xs, ys, zs } = a;
  const M = jdOffsets.length;
  if (M === 0) { out.set(0, 0, 0); return; }
  if (M === 1) { out.set(xs[0] * AU_VIS, zs[0] * AU_VIS, -ys[0] * AU_VIS); return; }

  const first = jdOffsets[0];
  const span  = jdOffsets[M - 1] - first;
  const d     = first + (((simDays - first) % span) + span) % span;

  let lo = 0, hi = M - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (jdOffsets[mid] <= d) lo = mid; else hi = mid;
  }
  const t = (d - jdOffsets[lo]) / (jdOffsets[hi] - jdOffsets[lo]);
  out.set(
    (xs[lo] + (xs[hi] - xs[lo]) * t) * AU_VIS,
     (zs[lo] + (zs[hi] - zs[lo]) * t) * AU_VIS,
    -(ys[lo] + (ys[hi] - ys[lo]) * t) * AU_VIS,
  );
}

// â”€â”€ Binary parser â€” yields between chunks to keep UI responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PARSE_CHUNK = 500; // asteroids to parse per microtask tick

function parseBinaryAsync(buf: ArrayBuffer): Promise<AsteroidData[]> {
  return new Promise((resolve) => {
    const view      = new DataView(buf);
    const total     = view.getUint32(0, true);
    const asteroids: AsteroidData[] = new Array(total);
    let   off       = 4;
    let   idx       = 0;

    function parseChunk() {
      const end = Math.min(idx + PARSE_CHUNK, total);
      for (; idx < end; idx++) {
        const nameLen   = view.getUint8(off); off += 1;
        const nameBytes = new Uint8Array(buf, off, nameLen); off += nameLen;
        const name      = new TextDecoder('ascii').decode(nameBytes);
        const M         = view.getUint32(off, true); off += 4;

        const jdOffsets = new Float32Array(M);
        const xs        = new Float32Array(M);
        const ys        = new Float32Array(M);
        const zs        = new Float32Array(M);
        for (let s = 0; s < M; s++) {
          jdOffsets[s] = view.getFloat32(off, true); off += 4;
          xs[s]        = view.getFloat32(off, true); off += 4;
          ys[s]        = view.getFloat32(off, true); off += 4;
          zs[s]        = view.getFloat32(off, true); off += 4;
        }
        asteroids[idx] = { name, jdOffsets, xs, ys, zs };
      }

      if (idx < total) {
        // Yield to browser then continue
        setTimeout(parseChunk, 0);
      } else {
        resolve(asteroids);
      }
    }

    parseChunk();
  });
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ── Orbit geometry builder ────────────────────────────────────────────────────
// Builds a single merged THREE.LineSegments for all 8 000 asteroid orbits.
// Runs async (chunked via setTimeout) so the main thread never blocks.
const ORBIT_SAMPLES     = 64;   // orbit path resolution per asteroid
const ORBIT_BUILD_CHUNK = 200;  // asteroids processed per setTimeout tick

function buildOrbitGeometryAsync(asteroids: AsteroidData[]): Promise<THREE.BufferGeometry> {
  return new Promise((resolve) => {
    const N         = asteroids.length;
    // LineSegments needs 2 vertices per segment; ORBIT_SAMPLES closed-loop segments per orbit
    const positions = new Float32Array(N * ORBIT_SAMPLES * 2 * 3);
    const pt0       = new THREE.Vector3();
    const pt1       = new THREE.Vector3();
    let off = 0;
    let i   = 0;

    function buildChunk() {
      const end = Math.min(i + ORBIT_BUILD_CHUNK, N);
      for (; i < end; i++) {
        const a     = asteroids[i];
        const first = a.jdOffsets[0];
        const span  = a.jdOffsets[a.jdOffsets.length - 1] - first;
        for (let s = 0; s < ORBIT_SAMPLES; s++) {
          const t0 = first + (s / ORBIT_SAMPLES) * span;
          const t1 = first + ((s + 1) / ORBIT_SAMPLES) * span;
          interpolatePosition(a, t0, pt0);
          interpolatePosition(a, t1, pt1);
          positions[off++] = pt0.x; positions[off++] = pt0.y; positions[off++] = pt0.z;
          positions[off++] = pt1.x; positions[off++] = pt1.y; positions[off++] = pt1.z;
        }
      }
      if (i < N) {
        setTimeout(buildChunk, 0);
      } else {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        resolve(g);
      }
    }
    buildChunk();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
// Default mode (showAllAsteroids=false): O(1) per frame — single dot + trail
//   for the selected asteroid only. Zero GPU work when nothing is selected.
// All-asteroids mode (showAllAsteroids=true): InstancedMesh 8 000 dots updated
//   every 4 frames + one merged LineSegments for all orbit paths (built once).
const TRAIL_LENGTH       = 120;
const TRAIL_SPACING      = 0.5;
const POSITION_UPDATE_EVERY = 4;

interface Props { visible: boolean; }

export function SpecificAsteroids({ visible }: Props) {
  const showAllAsteroids  = useSolarStore((s) => s.showAllAsteroids);
  const setAsteroidNames       = useSolarStore((s) => s.setAsteroidNames);
  const setAsteroidOrbitReady  = useSolarStore((s) => s.setAsteroidOrbitReady);
  const setNamedAsteroidCount  = useSolarStore((s) => s.setNamedAsteroidCount);

  const asteroidsRef      = useRef<AsteroidData[]>([]);
  const asteroidIdxMap    = useRef<Map<string, number>>(new Map());
  const loadedRef         = useRef(false);

  // Single-select mode
  const dotRef            = useRef<THREE.Mesh>(null!);
  const trailPtsRef       = useRef<Float32Array | null>(null);

  // All-asteroids mode
  const meshRef           = useRef<THREE.InstancedMesh>(null!);
  const orbitLinesRef     = useRef<THREE.LineSegments | null>(null);
  const orbitBuiltRef     = useRef(false);
  const frameCountRef     = useRef(0);
  const [loadedCount, setLoadedCount]   = useState(0);
  const [orbitReady, setOrbitReady]     = useState(false);

  // Scratch — never reallocated
  const tmpPos  = useMemo(() => new THREE.Vector3(), []);
  const tmpPos2 = useMemo(() => new THREE.Vector3(), []);
  const tmpMat  = useMemo(() => new THREE.Matrix4(), []);
  const tmpClr  = useMemo(() => new THREE.Color(), []);

  const trailLineObj = useMemo(() => {
    const g   = new THREE.BufferGeometry();
    const pts = new Float32Array((TRAIL_LENGTH + 1) * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    g.setDrawRange(0, 0);
    return new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color: '#FFD580', transparent: true, opacity: 0.5 }),
    );
  }, []);

  const orbitMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#5a5035', transparent: true, opacity: 0.35, depthWrite: false }),
    [],
  );

  // ── Load binary (async chunked — never blocks main thread) ────────────────
  useEffect(() => {
    fetch('/specific-asteroids/specific-asteroids.bin')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then((buf) => parseBinaryAsync(buf))
      .then((parsed) => {
        asteroidsRef.current = parsed;
        const idxMap = new Map<string, number>();
        parsed.forEach((a, i) => {
          idxMap.set(a.name, i);
          asteroidPositions.set(a.name, new THREE.Vector3());
          asteroidInfoMap.set(a.name, {
            name: a.name, distAU: 0, sampleCount: a.jdOffsets.length,
            jdFirst: a.jdOffsets[0] ?? 0,
            jdLast:  a.jdOffsets[a.jdOffsets.length - 1] ?? 0,
          });
        });
        asteroidIdxMap.current = idxMap;
        loadedRef.current = true;
        setLoadedCount(parsed.length);
        setNamedAsteroidCount(parsed.length);
        setAsteroidNames(parsed.map((a) => a.name));
        // If all-asteroids mode was already on before load finished, start building
        if (useSolarStore.getState().showAllAsteroids) kickOrbitBuild(parsed);
      })
      .catch((err) => console.error('[SpecificAsteroids] load failed:', err));
  }, []);

  // ── Start orbit build when showAllAsteroids turns on after binary loads ───
  function kickOrbitBuild(asteroids: AsteroidData[]) {
    if (orbitBuiltRef.current) return;
    orbitBuiltRef.current = true;
    buildOrbitGeometryAsync(asteroids).then((geom) => {
      orbitLinesRef.current = new THREE.LineSegments(geom, orbitMaterial);
      setOrbitReady(true);
      setAsteroidOrbitReady(true);
    });
  }

  useEffect(() => {
    if (!showAllAsteroids || !loadedRef.current) return;
    kickOrbitBuild(asteroidsRef.current);
  }, [showAllAsteroids]);

  // ── Per-frame update ───────────────────────────────────────────────────────
  useFrame(() => {
    if (!loadedRef.current || !visible) return;

    const { simulationDays }         = useTimeStore.getState();
    const { selectedAsteroidId: selId, showAllAsteroids: showAll } = useSolarStore.getState();
    const asteroids = asteroidsRef.current;
    const selIdx    = selId != null ? (asteroidIdxMap.current.get(selId) ?? -1) : -1;

    if (showAll) {
      // ── All-asteroids mode ───────────────────────────────────────────────
      const mesh = meshRef.current;
      if (mesh) {
        frameCountRef.current++;
        const isFullUpdate = frameCountRef.current === 1
          || (frameCountRef.current % POSITION_UPDATE_EVERY) === 0;

        if (isFullUpdate) {
          for (let i = 0; i < asteroids.length; i++) {
            const a = asteroids[i];
            interpolatePosition(a, simulationDays, tmpPos);
            asteroidPositions.get(a.name)?.copy(tmpPos);
            const info = asteroidInfoMap.get(a.name);
            if (info) info.distAU = tmpPos.length() / AU_VIS;
            tmpMat.makeTranslation(tmpPos.x, tmpPos.y, tmpPos.z);
            mesh.setMatrixAt(i, tmpMat);
            mesh.setColorAt(i, tmpClr.set(i === selIdx ? '#FFD580' : '#c8a86a'));
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        } else if (selIdx >= 0) {
          // Keep selected asteroid live on non-full frames too
          const a = asteroids[selIdx];
          interpolatePosition(a, simulationDays, tmpPos);
          asteroidPositions.get(a.name)?.copy(tmpPos);
          const info = asteroidInfoMap.get(a.name);
          if (info) info.distAU = tmpPos.length() / AU_VIS;
          tmpMat.makeTranslation(tmpPos.x, tmpPos.y, tmpPos.z);
          mesh.setMatrixAt(selIdx, tmpMat);
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
      // Hide single dot in all-asteroids mode
      if (dotRef.current) dotRef.current.visible = false;
    } else {
      // ── Single-select mode (O(1)) ────────────────────────────────────────
      if (selIdx < 0) {
        if (dotRef.current) dotRef.current.visible = false;
        (trailLineObj.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
        return;
      }
      const a = asteroids[selIdx];
      interpolatePosition(a, simulationDays, tmpPos);
      asteroidPositions.get(a.name)?.copy(tmpPos);
      const info = asteroidInfoMap.get(a.name);
      if (info) info.distAU = tmpPos.length() / AU_VIS;
      const dot = dotRef.current;
      if (dot) { dot.visible = true; dot.position.copy(tmpPos); }
    }

    // ── Trail (shared between modes, always shows for selected) ───────────
    if (selIdx >= 0) {
      const a   = asteroids[selIdx];
      const pts = trailPtsRef.current ?? new Float32Array((TRAIL_LENGTH + 1) * 3);
      trailPtsRef.current = pts;
      for (let t = 0; t <= TRAIL_LENGTH; t++) {
        interpolatePosition(a, simulationDays - (TRAIL_LENGTH - t) * TRAIL_SPACING, tmpPos2);
        pts[t * 3] = tmpPos2.x; pts[t * 3 + 1] = tmpPos2.y; pts[t * 3 + 2] = tmpPos2.z;
      }
      const geom    = trailLineObj.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      posAttr.copyArray(pts);
      posAttr.needsUpdate = true;
      geom.setDrawRange(0, TRAIL_LENGTH + 1);
      geom.computeBoundingSphere();
    } else {
      (trailLineObj.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Single gold dot — shown in single-select mode only */}
      <mesh ref={dotRef} visible={false} frustumCulled={false}>
        <octahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial color="#FFD580" emissive="#FFD580" emissiveIntensity={0.4} roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Shared trail */}
      <primitive object={trailLineObj} />

      {/* All-asteroids mode: 8 000 dots */}
      {showAllAsteroids && loadedCount > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, loadedCount]}
          frustumCulled={false}
          onClick={(e) => {
            e.stopPropagation();
            const idx = e.instanceId ?? -1;
            if (idx >= 0 && idx < asteroidsRef.current.length) {
              useSolarStore.getState().setSelectedAsteroid(asteroidsRef.current[idx].name);
            }
          }}
        >
          <octahedronGeometry args={[0.04, 0]} />
          <meshStandardMaterial vertexColors roughness={0.7} metalness={0.3} />
        </instancedMesh>
      )}

      {/* All-asteroids mode: merged orbit paths (shown once built) */}
      {showAllAsteroids && orbitReady && orbitLinesRef.current && (
        <primitive object={orbitLinesRef.current} />
      )}
    </group>
  );
}

