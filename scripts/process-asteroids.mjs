/**
 * process-asteroids.mjs
 *
 * Converts public/asteroids/all_asteroids.csv (Eleanor Lutz / NASA JPL dataset,
 * ~794k rows) into a compact binary file: public/asteroids/asteroids.bin
 *
 * Binary layout
 * ─────────────
 *   Bytes 0–3  : UInt32LE  – record count (N)
 *   Bytes 4…   : N × 20 bytes, each record = 5 × Float32LE
 *     [0] a_au   – semi-major axis in AU  (Kepler: a = (per/365.25)^(2/3))
 *     [1] e      – eccentricity           (e = 1 − q/a)
 *     [2] ang0   – initial orbital angle  (uniform random 0…2π)
 *     [3] sinI   – sin(inclination)       (approx normal distribution per class)
 *     [4] gIdx   – visual group index 0–8 (stored as float for typed-array ease)
 *
 * Visual group map
 * ──────────────────────────────────────────────────────────────────────────────
 *   0  NEO        IEO / ATE / APO / AMO               S-type warm brown
 *   1  Inner-appr MCA / HUN / PHO / IMB               orange-tan
 *   2  MBA inner  MBA with a < 2.50 AU                S-type
 *   3  MBA middle MBA with 2.50 ≤ a < 2.82 AU         M/C mix
 *   4  MBA/OMB    MBA with a ≥ 2.82 AU, or OMB        C-type dark grey
 *   5  Hilda      HIL, HLD                            D-type dark brown
 *   6  TJN        TJN (Jupiter Trojans L5)            D-type very dark
 *   7  GRK        GRK (Jupiter Greeks L4)             D-type very dark
 *   8  CEN/TNO    CEN / TNO / SDO / ETN / OOC         blue-grey primitive
 *
 * Run:  node scripts/process-asteroids.mjs
 */

import { createReadStream }    from 'node:fs';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createInterface }     from 'node:readline';
import { fileURLToPath }       from 'node:url';
import { dirname, resolve }    from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const INPUT  = resolve(ROOT, 'public', 'asteroids', 'all_asteroids.csv');
const OUTPUT = resolve(ROOT, 'public', 'asteroids', 'asteroids.bin');



// ── CSV column indices (0-based) ──────────────────────────────────────────────
// id,spkid,full_name,pdes,name,neo,pha,diameter,prefix,q,per,class
const COL_Q   = 9;
const COL_PER = 10;
const COL_CLS = 11;

// ── Minimal CSV parser (handles double-quoted fields with embedded commas) ────
function parseLine(line) {
  const cols = [];
  let cur     = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

// ── Class → visual group index ────────────────────────────────────────────────
function classToGroup(cls, a_au) {
  switch (cls) {
    case 'IEO': case 'ATE': case 'APO': case 'AMO': return 0;  // NEO
    case 'MCA': case 'HUN': case 'PHO': case 'IMB': return 1;  // inner-approaching
    case 'MBA':
      if (a_au < 2.50) return 2;   // inner
      if (a_au < 2.82) return 3;   // middle
      return 4;                     // outer
    case 'OMB': return 4;
    case 'HIL': case 'HLD': return 5;  // Hilda
    case 'TJN': return 6;               // Trojans L5
    case 'GRK': return 7;               // Greeks  L4
    case 'CEN': case 'TNO': case 'SDO':
    case 'ETN': case 'OOC': return 8;   // Centaurs / TNOs
    default:    return 3;               // fallback middle belt
  }
}

// ── Typical inclination σ (radians) per group ────────────────────────────────
// The CSV doesn't carry inclination; we approximate with a realistic Gaussian
// dispersion derived from the actual belt inclination distributions.
const INCL_SIGMA_DEG = [28, 18, 12, 12, 16, 10, 25, 25, 38];

function sampleInclination(group) {
  const sigRad = (INCL_SIGMA_DEG[group] ?? 15) * (Math.PI / 180);
  // Box-Muller transform for normal distribution
  const u1 = Math.random() + 1e-12;
  const u2 = Math.random();
  const n   = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.sin(n * sigRad * 0.45); // 0.45 damps to keep most near ecliptic
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!existsSync(INPUT)) {
  console.error(`ERROR: Input file not found:\n  ${INPUT}`);
  process.exit(1);
}

console.log(`Reading: ${INPUT}`);

const records = []; // flat: [a, e, ang0, sinI, gIdx, ...]
let skipped  = 0;
let total    = 0;
let isHeader = true;

const rl = createInterface({ input: createReadStream(INPUT), crlfDelay: Infinity });

for await (const line of rl) {
  if (isHeader) { isHeader = false; continue; }
  if (!line.trim()) continue;

  total++;

  const cols = parseLine(line);
  if (cols.length <= COL_CLS) { skipped++; continue; }

  const q   = parseFloat(cols[COL_Q]);
  const per = parseFloat(cols[COL_PER]);
  const cls = (cols[COL_CLS] ?? '').toUpperCase();

  if (!isFinite(q) || !isFinite(per) || q <= 0 || per <= 0) { skipped++; continue; }

  // Kepler's 3rd law: T² = a³  →  a = (T/365.25)^(2/3) AU
  const a = Math.pow(per / 365.25, 2 / 3);
  if (!isFinite(a) || a < 0.3 || a > 40) { skipped++; continue; }

  // Eccentricity from perihelion distance
  const e = Math.max(0, Math.min(0.98, 1 - q / a));
  if (!isFinite(e)) { skipped++; continue; }

  const gIdx = classToGroup(cls, a);
  const ang0 = Math.random() * Math.PI * 2;
  const sinI = sampleInclination(gIdx);

  records.push(a, e, ang0, sinI, gIdx);
}

const count  = records.length / 5;
const f32    = new Float32Array(records);
const outBuf = Buffer.allocUnsafe(4 + f32.byteLength);
outBuf.writeUInt32LE(count, 0);
Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength).copy(outBuf, 4);

mkdirSync(resolve(ROOT, 'public', 'asteroids'), { recursive: true });
writeFileSync(OUTPUT, outBuf);

console.log(`\n✓ Wrote ${count.toLocaleString()} asteroids`  +
            ` (${skipped.toLocaleString()} skipped of ${total.toLocaleString()} parsed)`);
console.log(`✓ Output: ${OUTPUT}`);
console.log(`✓ Size: ${(outBuf.length / 1_048_576).toFixed(2)} MB`);
