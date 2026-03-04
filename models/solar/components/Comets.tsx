'use client';

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTimeStore } from '../physics/TimeScale';
import { DISTANCE_SCALE, AU_KM } from '../data/physicsConstants';

const AU = AU_KM * DISTANCE_SCALE;

// Realistic comet colors — dark inactive nucleus dust mixed with icy coma:
//   0  JFc  Jupiter-family comets   → cool gray-white (dust coma + ice)
//   1  HTC  Halley-type comets      → slightly warmer dusty gray
//   2  ETc  Encke-type comets       → warm dust gray
//   3  CTc  Chiron-type comets      → neutral gray (distant, less coma)
//   4  COM  Other periodic comets   → cool dusty gray-white
const GROUP_COLORS = [
  new THREE.Color('#c8cac0'),   // 0 JFc  cool gray-white
  new THREE.Color('#c0bdb0'),   // 1 HTC  dusty gray
  new THREE.Color('#c4b8a8'),   // 2 ETc  warm dust gray
  new THREE.Color('#b0b4b0'),   // 3 CTc  neutral gray
  new THREE.Color('#caccbe'),   // 4 COM  cool dusty gray-white
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
  const float INV_YEAR = 0.00273785;   // 1/365.25

  void main() {
    // Approximate Keplerian mean-motion (rad/day): n = 2π / T,  T ∝ a^1.5 years
    float orbitSpd = TWO_PI * INV_YEAR / pow(a_au, 1.5);
    float angle    = ang0 + orbitSpd * uTime;

    // Ellipse radius at current eccentric angle (simplified osculating orbit)
    float r = a_au * (1.0 - ecc * cos(angle)) * uAU;

    float x = cos(angle) * r;
    float z = sin(angle) * r;
    // Comets have much higher inclinations than asteroids – use 0.35× spread
    // (vs 0.10× for the asteroid belt).  sinI may be negative (retrograde).
    float y = sinI * a_au * uAU * 0.35;

    fCol   = vCol;
    fAlpha = 1.0;

    vec4  mvPos   = modelViewMatrix * vec4(x, y, z, 1.0);
    float rawSize = uSize * (300.0 / -mvPos.z);
    gl_PointSize  = clamp(rawSize, 0.3, 3.5);
    gl_Position   = projectionMatrix * mvPos;
  }
`;

// ── Fragment shader ───────────────────────────────────────────────────────────
const FRAG = `
  varying vec3  fCol;
  varying float fAlpha;

  void main() {
    vec2  uv    = gl_PointCoord - 0.5;
    float d     = dot(uv, uv) * 4.0;
    float alpha = (1.0 - d) * 0.90 * fAlpha;
    gl_FragColor = vec4(fCol, max(alpha, 0.0));
  }
`;

// ── Component ─────────────────────────────────────────────────────────────────
export function Comets({ visible = true, onReady }: { visible?: boolean; onReady?: () => void }) {
  const matRef      = useRef<THREE.ShaderMaterial>(null!);
  const simTimeDays = useRef(0);
  const [geo, setGeo] = useState<THREE.BufferGeometry | null>(null);

  // ── Fetch binary, build BufferGeometry with per-vertex orbital attrs ──────
  // Binary: UInt32LE count, then count × 5 × Float32LE  [a_au, e, ang0, sinI, gIdx]
  useEffect(() => {
    let cancelled = false;

    fetch('/comets/comets.bin')
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
          const gIdx = Math.max(0, Math.min(4, Math.round(f[i * 5 + 4])));
          const col  = GROUP_COLORS[gIdx];
          colBuf[i * 3]     = col.r;
          colBuf[i * 3 + 1] = col.g;
          colBuf[i * 3 + 2] = col.b;
        }

        // Placeholder position buffer (actual positions computed in vertex shader)
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));

        // Comets (especially HTC) can reach ~200+ AU aphelion.
        // Set a generous bounding sphere so frustum culling never clips them.
        g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), AU * 300);

        g.setAttribute('a_au',  new THREE.BufferAttribute(aBuf,    1));
        g.setAttribute('ecc',   new THREE.BufferAttribute(eccBuf,  1));
        g.setAttribute('ang0',  new THREE.BufferAttribute(ang0Buf, 1));
        g.setAttribute('sinI',  new THREE.BufferAttribute(sinIBuf, 1));
        g.setAttribute('vCol',  new THREE.BufferAttribute(colBuf,  3));

        setGeo(g);
        onReady?.();
      })
      .catch(err => console.warn('[Comets] Failed to load comets.bin –', err.message));

    return () => { cancelled = true; };
  }, []);

  // ── Advance simulated time and push to shader uniforms ────────────────────
  useFrame((_state, delta) => {
    if (!visible) return;
    simTimeDays.current += (delta * useTimeStore.getState().timeScale) / 86_400;
    if (matRef.current) matRef.current.uniforms.uTime.value = simTimeDays.current;
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
          uSize: { value: 2.0 },
        }}
      />
    </points>
  );
}
