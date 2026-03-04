/**
 * refresh-horizons-ephemeris.mjs
 *
 * Downloads fresh NASA Horizons XYZ ephemeris data for all asteroids
 * whose SPK-IDs are recorded in the existing binary, for the date range
 * 2022-Jan-01 to 2028-Jan-01 (7-day steps → ~313 samples per asteroid).
 *
 * This replaces the Eleanor Lutz dataset (1998-2000) with data that actually
 * covers the current simulation epoch (March 2026).
 *
 * Runs 8 parallel requests, respects a 200 ms inter-request delay, and
 * skips asteroids whose CSV already exists (resume-safe).
 *
 * Run:  node scripts/refresh-horizons-ephemeris.mjs
 *   Or: npm run refresh-ephemeris
 *
 * After completion it auto-runs process-specific-asteroids.mjs to rebuild bin.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname }     from 'node:path';
import { fileURLToPath }        from 'node:url';
import { execSync }             from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT_DIR   = resolve(ROOT, 'public', 'specific-asteroids', 'current');
const BIN_PATH  = resolve(ROOT, 'public', 'specific-asteroids', 'specific-asteroids.bin');

const START     = '2022-01-01';
const STOP      = '2028-01-01';
const STEP      = '7d';
const CONCURRENCY = 8;
const DELAY_MS    = 200;   // pause between batches to be polite to JPL

// ── Read SPK-IDs from existing binary ─────────────────────────────────────────
function readAsteroidNames(binPath) {
  const buf  = readFileSync(binPath);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off    = 0;
  const total = view.getUint32(off, true); off += 4;
  const names = [];
  for (let i = 0; i < total; i++) {
    const nlen = view.getUint8(off); off += 1;
    const n    = new TextDecoder('ascii').decode(buf.slice(off, off + nlen)); off += nlen;
    const M    = view.getUint32(off, true); off += 4;
    off += M * 16;
    names.push(n);
  }
  return names;
}

// Convert display name → IAU number string for Horizons COMMAND parameter
// "(699)" → "699"   "(12345)" → "12345"   (DES= forms returned as-is)
function nameToIAU(name) {
  const m = name.match(/^\((\d+)\)$/);
  if (m) return m[1];          // e.g. "699"
  return name.replace(/^DES=/, '');
}

// Convert display name → file-safe string matching process script expectations
// "(699)" → "2000699"  (process script: DES=+2000699.csv → asteroid (699))
function nameToFilename(name) {
  const m = name.match(/^\((\d+)\)$/);
  if (m) return String(2_000_000 + parseInt(m[1], 10));
  return name.replace(/^DES=/, '');
}

// ── Horizons REST API query ───────────────────────────────────────────────────
function buildHorizonsUrl(command) {
  const q = [
    `format=text`,
    `COMMAND=${command}`,
    `OBJ_DATA='NO'`,
    `MAKE_EPHEM='YES'`,
    `EPHEM_TYPE='VECTORS'`,
    `CENTER='500@10'`,
    `START_TIME='${START}'`,
    `STOP_TIME='${STOP}'`,
    `STEP_SIZE='${STEP}'`,
    `VEC_TABLE='1'`,
    `REF_PLANE='ECLIPTIC'`,
    `OUT_UNITS='KM-S'`,
    `CSV_FORMAT='YES'`,
  ].join('&');
  return `https://ssd.jpl.nasa.gov/api/horizons.api?${q}`;
}

async function queryHorizons(command) {
  const url = buildHorizonsUrl(command);
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchHorizons(iauNum) {
  // Try IAU number first: COMMAND='699;'
  let text = await queryHorizons(`'${iauNum}%3B'`);

  // If the IAU-number lookup hit an out-of-bounds error, retry with DES= form
  if (!text.includes('$$SOE') || text.includes('out of bounds') || text.includes('DXREAD')) {
    text = await queryHorizons(`'DES%3D${iauNum}%3B'`);
  }

  // Final checks — Horizons may return 200 with an error message in the body
  if (!text.includes('$$SOE')) {
    const preview = text.substring(0, 200).replace(/\s+/g, ' ');
    throw new Error(`No data for ${iauNum}: ${preview}`);
  }

  // Extract lines between $$SOE and $$EOE
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx < 0 || eoeIdx < 0) throw new Error(`No SOE/EOE markers for ${iauNum}`);

  const dataLines = text.substring(soeIdx + 5, eoeIdx).trim();

  // Build CSV in the same format as Eleanor Lutz dataset
  // Horizons VECTORS CSV format: JDTDB, Cal.Date/TDB, X, Y, Z, VX, VY, VZ, LT, RG, RR
  // We only need JDTDB, CalDate, X, Y, Z
  const rows = [];
  for (const raw of dataLines.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 5) continue;
    if (!/^\d/.test(parts[0])) continue;
    rows.push(`${parts[0]}, ${parts[1]}, ${parts[2]}, ${parts[3]}, ${parts[4]},`);
  }

  if (rows.length < 2) throw new Error(`Too few rows (${rows.length}) for ${iauNum}`);

  // Header matching existing CSV format
  const csv = [
    '$$SOE',
    ...rows,
    '$$EOE',
  ].join('\n');

  return csv;
}

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

const names = readAsteroidNames(BIN_PATH);
console.log(`Found ${names.length} asteroids in binary\n`);

let done = 0, skipped = 0, failed = 0;
const errors = [];

async function processOne(name) {
  const iauNum  = nameToIAU(name);
  const fileKey = nameToFilename(name);
  const outFile = resolve(OUT_DIR, `DES=${fileKey}.csv`);

  if (existsSync(outFile)) {
    skipped++;
    return;
  }

  try {
    const csv = await fetchHorizons(iauNum);
    writeFileSync(outFile, csv, 'utf8');
    done++;
  } catch (err) {
    failed++;
    errors.push(`${name} (${iauNum}): ${err.message.substring(0, 80)}`);
  }
}

// Process in batches of CONCURRENCY
const total = names.length;
for (let i = 0; i < total; i += CONCURRENCY) {
  const batch = names.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(processOne));

  const pct = Math.round(((i + batch.length) / total) * 100);
  process.stdout.write(`\r  Progress: ${i + batch.length}/${total} (${pct}%)  ✓${done} skip${skipped} ✗${failed}   `);

  if (i + CONCURRENCY < total) {
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

console.log('\n');

if (errors.length > 0) {
  console.log(`⚠  ${errors.length} failures:`);
  errors.slice(0, 20).forEach((e) => console.log('  ', e));
  if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  console.log();
}

console.log(`✅  Downloaded: ${done}  Skipped: ${skipped}  Failed: ${failed}`);

// Remove old Eleanor Lutz data (1998-2000) if we got enough fresh data
const freshCount = done + skipped;
const OLD_DIRS = ['inner', 'outer'].map((d) => resolve(ROOT, 'public', 'specific-asteroids', d));
if (freshCount >= names.length * 0.8) {
  for (const d of OLD_DIRS) {
    if (existsSync(d)) {
      rmSync(d, { recursive: true, force: true });
      console.log(`  Removed old data dir: ${d}`);
    }
  }
} else {
  console.log(`⚠  Only ${freshCount} fresh files — keeping old /inner and /outer as fallback`);
}

console.log(`\nRebuilding binary with fresh 2022-2028 data…\n`);

// Update INPUT_DIR in process script output dir → current
// The process script already picks up all subdirs, so dropping files in
// public/specific-asteroids/current/ is enough
execSync('node scripts/process-specific-asteroids.mjs', {
  cwd: ROOT,
  stdio: 'inherit',
});

console.log('\n✅  Done — asteroid positions now cover 2022-2028.');
