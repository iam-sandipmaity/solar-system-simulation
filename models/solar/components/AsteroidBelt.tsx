'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTimeStore } from '../physics/TimeScale';
import { DISTANCE_SCALE, AU_KM } from '../data/physicsConstants';

const AU = AU_KM * DISTANCE_SCALE;

// LOD draw-count thresholds (camera distance in visual units → asteroid count).
// Sorted descending so the first matching entry wins.
// At full-system zoom (~30 AU) we only render 120k; close-up renders all 792k.
const LOD_LEVELS = [
  { dist: AU * 30, count: 120_000 },
  { dist: AU * 15, count: 240_000 },
  { dist: AU *  8, count: 420_000 },
  { dist: AU *  4, count: 600_000 },
  { dist:       0, count: 792_000 },  // fallback – full dataset
];

// Realistic spectroscopic colors per taxonomic group:
//   0  NEO (IEO/ATE/APO/AMO)       S/C mixed  → warm tan-gray
//   1  Inner-approach (MCA/IMB)     S-type     → sandy stone
//   2  MBA inner  (a < 2.50 AU)     S-type     → warm stony brown
//   3  MBA middle (2.50–2.82 AU)    C/S mix    → cool pebble gray
//   4  MBA outer / OMB              C-type     → dark charcoal (carbonaceous)
//   5  Hilda (HIL/HLD)              D-type     → dark reddish-brown
//   6  TJN Trojans L5               D/P-type   → dark brown-gray
//   7  GRK Greeks L4                D/P-type   → dark ruddy-brown
//   8  CEN / TNO                    mixed      → muted reddish-gray
const GROUP_COLORS = [
  new THREE.Color('#b89c7a'),   // 0 NEO       warm tan-gray
  new THREE.Color('#a8845c'),   // 1 MCA/IMB   sandy stone
  new THREE.Color('#c0a07c'),   // 2 MBA inner  stony brown
  new THREE.Color('#9a9080'),   // 3 MBA mid    cool pebble gray
  new THREE.Color('#5e5a52'),   // 4 MBA outer  dark charcoal C-type
  new THREE.Color('#7a4e38'),   // 5 Hilda      dark reddish-brown D-type
  new THREE.Color('#6a5040'),   // 6 TJN        dark brown-gray
  new THREE.Color('#6e4c3c'),   // 7 GRK        dark ruddy-brown
  new THREE.Color('#a07a68'),   // 8 CEN/TNO    muted reddish-gray
];

// ── Vertex shader ─────────────────────────────────────────────────────────────
const VERT = `
  attribute float a_au;
  attribute float ecc;
  attribute float ang0;
  attribute float sinI;
  attribute vec3  vCol;

  uniform float uTime;
  uniform float uAU;
  uniform float uSize;

  varying vec3  fCol;
  varying float fAlpha;

  const float TWO_PI   = 6.28318530718;
  const float INV_YEAR = 0.00273785;

  void main() {
    float orbitSpd = TWO_PI * INV_YEAR / pow(a_au, 1.5);
    float angle    = ang0 + orbitSpd * uTime;
    float r        = a_au * (1.0 - ecc * cos(angle)) * uAU;

    float x = cos(angle) * r;
    float z = sin(angle) * r;
    float y = sinI * a_au * uAU * 0.10;

    // Two-stage outer-belt fade
    float t1      = smoothstep(3.3, 5.5, a_au);
    float t2      = smoothstep(5.0, 8.0, a_au);
    float sizeMul = 1.0 - t1 * 0.65 - t2 * 0.34;
    fAlpha        = 1.0 - t1 * 0.70 - t2 * 0.29;

    fCol = vCol;

    // GPU-discard near-invisible outer points before they reach the fragment
    // stage: push w < 0 so the GPU clips them entirely (zero fill cost).
    if (fAlpha < 0.02) {
      gl_Position  = vec4(0.0, 0.0, -2.0, 1.0); // behind near-plane
      gl_PointSize = 0.0;
      return;
    }

    vec4 mvPos   = modelViewMatrix * vec4(x, y, z, 1.0);
    float rawSize = uSize * (300.0 / -mvPos.z) * sizeMul;
    gl_PointSize  = clamp(rawSize, 0.2, 2.0);
    gl_Position   = projectionMatrix * mvPos;
  }
`;

// ── Fragment shader — no discard, just alpha=0 outside disc ──────────────────
// Avoids GPU pipeline stall from discard on overlapping transparent surfaces.
const FRAG = `
  varying vec3  fCol;
  varying float fAlpha;

  void main() {
    vec2  uv    = gl_PointCoord - 0.5;
    float d     = dot(uv, uv) * 4.0;      // d = 0 centre … 1 edge (no sqrt)
    float alpha = (1.0 - d) * 0.85 * fAlpha;
    gl_FragColor = vec4(fCol, max(alpha, 0.0));
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export function AsteroidBelt({ visible = true, onReady }: { visible?: boolean; onReady?: () => void }) {
  const matRef      = useRef<THREE.ShaderMaterial>(null!);
  const geoRef      = useRef<THREE.BufferGeometry | null>(null);
  const simTimeDays = useRef(0);
  const lastCount   = useRef(-1);
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);

  // ── Fetch binary, build one BufferGeometry with per-vertex orbital attrs ──
  // Binary: UInt32LE count, then count × 5 × Float32LE [a_au, e, ang0, sinI, gIdx]
  useEffect(() => {
    let cancelled = false;

    fetch('/asteroids/asteroids.bin')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(buf => {
        if (cancelled) return;

        const view  = new DataView(buf);
        const total = view.getUint32(0, true);
        const f     = new Float32Array(buf, 4, total * 5);

        const aBuf    = new Float32Array(total);
        const eccBuf  = new Float32Array(total);
        const ang0Buf = new Float32Array(total);
        const sinIBuf = new Float32Array(total);
        const colBuf  = new Float32Array(total * 3);

        for (let i = 0; i < total; i++) {
          aBuf[i]    = f[i * 5];
          eccBuf[i]  = f[i * 5 + 1];
          ang0Buf[i] = f[i * 5 + 2];
          sinIBuf[i] = f[i * 5 + 3];
          const col  = GROUP_COLORS[Math.max(0, Math.min(8, Math.round(f[i * 5 + 4])))];
          colBuf[i * 3]     = col.r;
          colBuf[i * 3 + 1] = col.g;
          colBuf[i * 3 + 2] = col.b;
        }

        // Three.js Points requires a 'position' attribute – actual positions
        // are computed in the vertex shader, so this is just a placeholder.
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));

        // The position buffer is all zeros so Three.js would compute a bounding
        // sphere of radius 0 → the whole belt gets frustum-culled from most
        // angles. Set a sphere large enough to always contain the real orbits.
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), AU * 55);
        g.setAttribute('a_au',     new THREE.BufferAttribute(aBuf,    1));
        g.setAttribute('ecc',      new THREE.BufferAttribute(eccBuf,  1));
        g.setAttribute('ang0',     new THREE.BufferAttribute(ang0Buf, 1));
        g.setAttribute('sinI',     new THREE.BufferAttribute(sinIBuf, 1));
        g.setAttribute('vCol',     new THREE.BufferAttribute(colBuf,  3));

        geoRef.current = g;
        setGeo(g);
        onReady?.();
      })
      .catch(err => console.warn('[AsteroidBelt] Failed to load asteroids.bin –', err.message));

    return () => { cancelled = true; };
  }, []);

  // ── Advance simulated time, push to shader; update LOD draw range ───────────
  useFrame(({ camera }, delta) => {
    if (!visible) return;
    simTimeDays.current += (delta * useTimeStore.getState().timeScale) / 86_400;
    if (matRef.current) matRef.current.uniforms.uTime.value = simTimeDays.current;

    // LOD: pick draw count based on camera distance from origin
    const g = geoRef.current;
    if (g) {
      const camDist = camera.position.length();
      let target = LOD_LEVELS[LOD_LEVELS.length - 1].count;
      for (const lvl of LOD_LEVELS) {
        if (camDist >= lvl.dist) { target = lvl.count; break; }
      }
      if (target !== lastCount.current) {
        g.setDrawRange(0, target);
        lastCount.current = target;
      }
    }
  });

  if (!visible || !geo) return null;

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uAU:   { value: AU },
          uSize: { value: 1.0 },
        }}
      />
    </points>
  );
}

