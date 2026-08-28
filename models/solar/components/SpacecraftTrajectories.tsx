'use client';

/**
 * Historic spacecraft trajectories from NASA JPL Horizons (heliocentric
 * ecliptic J2000, AU). Rendered in the same visual language as planet orbits:
 * faint lines, orange-adjacent highlight on selection, clickable markers,
 * Html labels.
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSolarStore } from '../SolarStore';
import { useTimeStore } from '../physics/TimeScale';
import { AU_KM, DISTANCE_SCALE } from '../data/physicsConstants';

const AU_VIS = AU_KM * DISTANCE_SCALE;

export interface SpacecraftInfo {
  id: string;
  name: string;
  agency: string;
  launched: string;
  status: string;
  target: string;
  color: string;
  facts: string[];
  samples: number;
  distAU: number;
  jdFirst: number;
  jdLast: number;
  inFlight: boolean;
}

export const spacecraftPositions = new Map<string, THREE.Vector3>();
export const spacecraftInfoMap = new Map<string, SpacecraftInfo>();

interface CraftData {
  id: string;
  name: string;
  agency: string;
  launched: string;
  status: string;
  target: string;
  color: string;
  facts: string[];
  samples: number;
  coastAfter: boolean;
  jd: Float32Array;
  xs: Float32Array;
  ys: Float32Array;
  zs: Float32Array;
}

function interpolatePosition(c: CraftData, simDays: number, out: THREE.Vector3): boolean {
  const { jd, xs, ys, zs } = c;
  const M = jd.length;
  if (M === 0) {
    out.set(0, 0, 0);
    return false;
  }
  if (simDays < jd[0]) {
    out.set(xs[0] * AU_VIS, zs[0] * AU_VIS, -ys[0] * AU_VIS);
    return false;
  }
  if (M === 1 || simDays >= jd[M - 1]) {
    if (c.coastAfter && simDays > jd[M - 1] && M >= 2) {
      const dt = jd[M - 1] - jd[M - 2];
      if (dt > 1e-6) {
        const t = (simDays - jd[M - 1]) / dt;
        const x = xs[M - 1] + (xs[M - 1] - xs[M - 2]) * t;
        const y = ys[M - 1] + (ys[M - 1] - ys[M - 2]) * t;
        const z = zs[M - 1] + (zs[M - 1] - zs[M - 2]) * t;
        out.set(x * AU_VIS, z * AU_VIS, -y * AU_VIS);
        return true;
      }
    }
    out.set(xs[M - 1] * AU_VIS, zs[M - 1] * AU_VIS, -ys[M - 1] * AU_VIS);
    return true;
  }

  let lo = 0;
  let hi = M - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (jd[mid] <= simDays) lo = mid;
    else hi = mid;
  }
  const span = jd[hi] - jd[lo];
  const t = span > 1e-9 ? (simDays - jd[lo]) / span : 0;
  const x = xs[lo] + (xs[hi] - xs[lo]) * t;
  const y = ys[lo] + (ys[hi] - ys[lo]) * t;
  const z = zs[lo] + (zs[hi] - zs[lo]) * t;
  out.set(x * AU_VIS, z * AU_VIS, -y * AU_VIS);
  return true;
}

function pathPoints(c: CraftData): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < c.jd.length; i++) {
    pts.push(new THREE.Vector3(c.xs[i] * AU_VIS, c.zs[i] * AU_VIS, -c.ys[i] * AU_VIS));
  }
  return pts;
}

function CraftMarker({
  craft,
  visiblePath,
}: {
  craft: CraftData;
  visiblePath: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const markerGroupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [inFlight, setInFlight] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const selectedId = useSolarStore((s) => s.selectedSpacecraftId);
  const showLabels = useSolarStore((s) => s.showLabels);
  const highlightFocusOrbit = useSolarStore((s) => s.highlightFocusOrbit);
  const isSelected = selectedId === craft.id;

  const lineObject = useMemo(() => {
    const pts = pathPoints(craft);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: craft.color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    return line;
  }, [craft]);

  useFrame(() => {
    const { simulationDays } = useTimeStore.getState();
    const flying = interpolatePosition(craft, simulationDays, tmp);
    spacecraftPositions.get(craft.id)?.copy(tmp);
    const info = spacecraftInfoMap.get(craft.id);
    if (info) {
      info.distAU = tmp.length() / AU_VIS;
      info.inFlight = flying;
    }
    if (markerGroupRef.current) {
      markerGroupRef.current.visible = flying;
      markerGroupRef.current.position.copy(tmp);
    }
    if (inFlight !== flying) setInFlight(flying);
    const mat = lineObject.material as THREE.LineBasicMaterial;
    const highlighted = highlightFocusOrbit && isSelected;
    mat.opacity = highlighted ? 0.72 : isSelected ? 0.5 : 0.18;
    mat.color.set(highlighted ? '#f0a030' : craft.color);
  });

  return (
    <group>
      {visiblePath && <primitive object={lineObject} />}
      <group ref={markerGroupRef} visible={false}>
        <mesh
          ref={meshRef}
          frustumCulled={false}
          onClick={(e) => {
            e.stopPropagation();
            const store = useSolarStore.getState();
            store.setSelectedSpacecraft(store.selectedSpacecraftId === craft.id ? null : craft.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <octahedronGeometry args={[0.09, 0]} />
          <meshStandardMaterial
            color={craft.color}
            emissive={craft.color}
            emissiveIntensity={isSelected ? 0.7 : 0.35}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
        {showLabels && inFlight && (hovered || isSelected) && (
          <Html position={[0, 0.14, 0]} zIndexRange={[100, 0]}>
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
              {craft.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

export function SpacecraftTrajectories({ visible = true }: { visible?: boolean }) {
  const [crafts, setCrafts] = useState<CraftData[]>([]);
  const spacecraftFocus = useSolarStore((s) => s.spacecraftFocus);
  const selectedSpacecraftId = useSolarStore((s) => s.selectedSpacecraftId);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/spacecraft.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: { spacecraft: Array<CraftData & { jd: number[]; x: number[]; y: number[]; z: number[] }> }) => {
        if (cancelled) return;
        const parsed: CraftData[] = payload.spacecraft.map((s) => {
          const craft: CraftData = {
            id: s.id,
            name: s.name,
            agency: s.agency,
            launched: s.launched,
            status: s.status,
            target: s.target,
            color: s.color,
            facts: s.facts,
            samples: s.samples,
            coastAfter: String(s.status).startsWith('Active'),
            jd: Float32Array.from(s.jd),
            xs: Float32Array.from(s.x),
            ys: Float32Array.from(s.y),
            zs: Float32Array.from(s.z),
          };
          spacecraftPositions.set(craft.id, new THREE.Vector3());
          spacecraftInfoMap.set(craft.id, {
            id: craft.id,
            name: craft.name,
            agency: craft.agency,
            launched: craft.launched,
            status: craft.status,
            target: craft.target,
            color: craft.color,
            facts: craft.facts,
            samples: craft.samples,
            distAU: 0,
            jdFirst: craft.jd[0] ?? 0,
            jdLast: craft.jd[craft.jd.length - 1] ?? 0,
            inFlight: false,
          });
          return craft;
        });
        setCrafts(parsed);
      })
      .catch((err) => console.warn('[Spacecraft] Failed to load spacecraft.json —', err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || crafts.length === 0) return null;

  return (
    <group>
      {crafts.map((craft) => {
        const visiblePath = !spacecraftFocus || selectedSpacecraftId === craft.id;
        return <CraftMarker key={craft.id} craft={craft} visiblePath={visiblePath} />;
      })}
    </group>
  );
}
