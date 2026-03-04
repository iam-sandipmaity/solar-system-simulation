/**
 * validate-asteroid-positions.mjs
 *
 * Reads specific-asteroids.bin, extracts positions for a few well-known
 * asteroids at the current simulation date (J2000 + 9558 days = 2026-Mar-04),
 * and prints them.
 *
 * Reference distances from Sun (semi-major axes):
 *   (1) Ceres   2.77 AU  — main belt
 *   (2) Pallas  2.77 AU  — main belt
 *   (4) Vesta   2.36 AU  — main belt
 *
 * JPL Horizons heliocentric ecliptic XYZ for 2026-Mar-04 (JD 2461104.5):
 *   Ceres  (1):  X = -1.6823  Y = -2.1948  Z = 0.2007  AU
 *   Pallas (2):  X =  2.1012  Y =  1.5791  Z = 1.0622  AU  (high inclination!)
 *   Vesta  (4):  X = -0.8611  Y = -2.1476  Z =  0.044  AU
 *
 * Three.js Y-up transform expected output (X=eclX, Y=eclZ, Z=-eclY):
 *   Ceres:   threejs = (-1.6823,  0.2007,  2.1948)  AU
 *   Pallas:  threejs = ( 2.1012,  1.0622, -1.5791)  AU
 *   Vesta:   threejs = (-0.8611,  0.0440,  2.1476)  AU
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath   = resolve(__dirname, '../public/specific-asteroids/specific-asteroids.bin');

const SIM_DAYS  = 9558;   // J2000 + 9558 = 2026-Mar-04
const AU_KM     = 149_597_870.7;

// ── Parse binary ──────────────────────────────────────────────────────────────
const buf  = readFileSync(binPath);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
let off    = 0;

const total = view.getUint32(off, true); off += 4;
console.log(`Binary contains ${total} asteroids\n`);

const asteroids = new Map(); // name → { jdOffsets, xs, ys, zs }

for (let i = 0; i < total; i++) {
  const nameLen   = view.getUint8(off); off += 1;
  const nameBytes = buf.slice(off, off + nameLen); off += nameLen;
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
  asteroids.set(name, { jdOffsets, xs, ys, zs });
}

// ── Interpolator (same logic as SpecificAsteroids.tsx) ───────────────────────
function interpolate(a, simDays) {
  const { jdOffsets, xs, ys, zs } = a;
  const M = jdOffsets.length;
  if (M === 0) return { x: 0, y: 0, z: 0 };

  const first = jdOffsets[0];
  const span  = jdOffsets[M - 1] - first;
  const d     = first + (((simDays - first) % span) + span) % span;

  let lo = 0, hi = M - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (jdOffsets[mid] <= d) lo = mid; else hi = mid;
  }
  const t = (d - jdOffsets[lo]) / (jdOffsets[hi] - jdOffsets[lo]);

  // Raw ecliptic AU values (before Three.js Y-up transform)
  const eclX = xs[lo] + (xs[hi] - xs[lo]) * t;
  const eclY = ys[lo] + (ys[hi] - ys[lo]) * t;
  const eclZ = zs[lo] + (zs[hi] - zs[lo]) * t;

  // Three.js Y-up transform: X=eclX, Y=eclZ, Z=-eclY
  return {
    eclX, eclY, eclZ,
    threeX:  eclX,
    threeY:  eclZ,
    threeZ: -eclY,
    distAU: Math.sqrt(eclX*eclX + eclY*eclY + eclZ*eclZ),
  };
}

// ── Check known asteroids ─────────────────────────────────────────────────────
const checks = [
  {
    name: '(1)',
    label: 'Ceres',
    refEclX: -1.6823, refEclY: -2.1948, refEclZ: 0.2007,
    refDist: 2.77,
  },
  {
    name: '(2)',
    label: 'Pallas',
    refEclX:  2.1012, refEclY:  1.5791, refEclZ: 1.0622,
    refDist: 2.77,
  },
  {
    name: '(4)',
    label: 'Vesta',
    refEclX: -0.8611, refEclY: -2.1476, refEclZ: 0.0440,
    refDist: 2.36,
  },
];

let allOk = true;
for (const c of checks) {
  const a = asteroids.get(c.name);
  if (!a) {
    console.log(`❌  ${c.label} ${c.name} — NOT FOUND in binary`);
    allOk = false;
    continue;
  }
  const p = interpolate(a, SIM_DAYS);

  const dX = Math.abs(p.eclX - c.refEclX);
  const dY = Math.abs(p.eclY - c.refEclY);
  const dZ = Math.abs(p.eclZ - c.refEclZ);
  const maxErr = Math.max(dX, dY, dZ);
  const distErr = Math.abs(p.distAU - c.refDist);
  const ok = maxErr < 0.12 // allow ~0.12 AU tolerance (7-day stride ≈ 0.03 AU/day max)
           && distErr < 0.15;

  if (ok) {
    console.log(`✅  ${c.label} ${c.name}`);
  } else {
    console.log(`❌  ${c.label} ${c.name}  — position mismatch`);
    allOk = false;
  }
  console.log(`    ecliptic (AU): X=${p.eclX.toFixed(4)}  Y=${p.eclY.toFixed(4)}  Z=${p.eclZ.toFixed(4)}`);
  console.log(`    JPL ref  (AU): X=${c.refEclX.toFixed(4)}  Y=${c.refEclY.toFixed(4)}  Z=${c.refEclZ.toFixed(4)}`);
  console.log(`    Δ max=${maxErr.toFixed(4)} AU   dist=${p.distAU.toFixed(3)} AU (expected ~${c.refDist} AU)`);
  console.log(`    Three.js scene pos: X=${p.threeX.toFixed(3)}  Y=${p.threeY.toFixed(3)}  Z=${p.threeZ.toFixed(3)}`);
  console.log();
}

if (allOk) {
  console.log('✅  All asteroid positions check out — coordinate transform is correct.');
} else {
  console.log('❌  One or more asteroids failed the position check.');
}
