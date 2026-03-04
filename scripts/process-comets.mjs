/**
 * process-comets.mjs
 *
 * Converts public/comets/all_comets.csv into a compact binary:
 *   public/comets/comets.bin
 *
 * Binary layout  (identical byte format to asteroids.bin)
 * ─────────────
 *   Bytes 0–3  : UInt32LE  – record count (N)
 *   Bytes 4…   : N × 20 bytes, each record = 5 × Float32LE
 *     [0] a_au   – semi-major axis (AU)   a = (per/365.25)^(2/3)
 *     [1] e      – eccentricity           e = 1 − q/a   (must be 0 < e < 1)
 *     [2] ang0   – initial orbital angle  (uniform random 0…2π)
 *     [3] sinI   – sin-like inclination spread (class-dependent)
 *     [4] gIdx   – visual group index 0–4
 *
 * Group map
 * ─────────────────────────────────────────────────────────────
 *   0  JFc  Jupiter-family comets   cold blue-white
 *   1  HTC  Halley-type comets      bright cyan-white
 *   2  ETc  Encke-type comets       warm blue-white
 *   3  CTc  Chiron-type comets      deep blue
 *   4  COM  Other periodic comets   icy white
 *
 * Only comets with a valid finite period (per > 0) and resulting
 * eccentricity 0 < e < 1 are written (parabolic/hyperbolic skipped).
 *
 * Run:  node scripts/process-comets.mjs
 */

import { createReadStream }                          from 'node:fs';
import { writeFileSync, mkdirSync, existsSync }      from 'node:fs';
import { createInterface }                           from 'node:readline';
import { fileURLToPath }                             from 'node:url';
import { dirname, resolve }                          from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const INPUT  = resolve(ROOT, 'public', 'comets', 'all_comets.csv');
const OUTPUT = resolve(ROOT, 'public', 'comets', 'comets.bin');

// ── CSV column indices ────────────────────────────────────────────────────────
// id,spkid,full_name,pdes,name,neo,pha,diameter,prefix,q,per,class
const COL_Q   = 9;
const COL_PER = 10;
const COL_CLS = 11;

function parseLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

// Class → group index
function classToGroup(cls) {
  switch (cls.trim()) {
    case 'JFc': return 0;
    case 'HTC': return 1;
    case 'ETc': return 2;
    case 'CTc': return 3;
    default:    return 4;   // COM and anything else with a valid period
  }
}

// Deterministic pseudo-random (park–miller style, no GC)
let seed = 0xDEADBEEF;
function rng() {
  seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0xFFFFFFFF;
}

// Class-specific vertical spread  (sinI range approximation)
// Comets have much higher inclinations than asteroids.
function randomSinI(cls) {
  switch (cls.trim()) {
    case 'JFc': return (rng() - 0.5) * 0.70;   // ~low like ecliptic ±20°
    case 'ETc': return (rng() - 0.5) * 0.50;   // very low, Encke-like
    case 'CTc': return (rng() - 0.5) * 1.10;   // Centaur-like, wider
    case 'HTC': return (rng() - 0.5) * 1.80;   // retrograde possible, very wide
    default:    return (rng() - 0.5) * 1.40;   // COM – isotropic-ish
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const records = [];  // array of Float32Array(5)
let skipped = 0;
let header  = true;

const rl = createInterface({ input: createReadStream(INPUT), crlfDelay: Infinity });

await new Promise((resolve, reject) => {
  rl.on('line', (line) => {
    if (!line.trim()) return;
    if (header) { header = false; return; }

    const cols = parseLine(line);
    const perStr = cols[COL_PER];
    const qStr   = cols[COL_Q];
    const cls    = (cols[COL_CLS] || '').trim();

    const per = parseFloat(perStr);
    const q   = parseFloat(qStr);

    // Skip if period is missing or non-positive (parabolic / hyperbolic)
    if (!isFinite(per) || per <= 0 || !isFinite(q) || q <= 0) {
      skipped++;
      return;
    }

    // Kepler 3rd law: a = (per / 365.25)^(2/3) AU
    const a_au = Math.pow(per / 365.25, 2 / 3);

    // Eccentricity: e = 1 − q/a
    const e = 1 - q / a_au;

    // Only valid elliptical orbits
    if (e <= 0 || e >= 1) {
      skipped++;
      return;
    }

    const ang0 = rng() * Math.PI * 2;
    const sinI = randomSinI(cls);
    const gIdx = classToGroup(cls);

    records.push([a_au, e, ang0, sinI, gIdx]);
  });

  rl.on('close', resolve);
  rl.on('error', reject);
});

// ── Write binary ─────────────────────────────────────────────────────────────
const N   = records.length;
const buf = Buffer.allocUnsafe(4 + N * 5 * 4);
buf.writeUInt32LE(N, 0);
let offset = 4;
for (const [a, e, ang0, sinI, gIdx] of records) {
  buf.writeFloatLE(a,    offset);      offset += 4;
  buf.writeFloatLE(e,    offset);      offset += 4;
  buf.writeFloatLE(ang0, offset);      offset += 4;
  buf.writeFloatLE(sinI, offset);      offset += 4;
  buf.writeFloatLE(gIdx, offset);      offset += 4;
}

if (!existsSync(resolve(ROOT, 'public', 'comets'))) {
  mkdirSync(resolve(ROOT, 'public', 'comets'), { recursive: true });
}
writeFileSync(OUTPUT, buf);

const mb = (buf.length / 1024 / 1024).toFixed(2);
console.log(`✔  Wrote ${N} comets (${skipped} skipped)  →  comets.bin  (${mb} MB)`);

// Group breakdown
const groups = ['JFc', 'HTC', 'ETc', 'CTc', 'COM/other'];
const counts  = new Array(5).fill(0);
for (const [,,,, g] of records) counts[Math.round(g)]++;
groups.forEach((g, i) => console.log(`   ${g}: ${counts[i]}`));
