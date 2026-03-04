/**
 * download-numbered-asteroids.mjs
 *
 * Downloads 2022-2028 Horizons ephemeris for numbered asteroids in a given
 * IAU-number range that are not yet in public/specific-asteroids/current/.
 *
 * Adds famous ones like (1) Ceres, (2) Pallas, (3) Juno, (4) Vesta …
 *
 * Run:  node scripts/download-numbered-asteroids.mjs
 *   Then: node scripts/process-specific-asteroids.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname }                      from 'node:path';
import { fileURLToPath }                         from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const OUT_DIR   = resolve(ROOT, 'public', 'specific-asteroids', 'current');

// ── Config ────────────────────────────────────────────────────────────────────
const START       = '2022-01-01';
const STOP        = '2028-01-01';
const STEP        = '7d';
const CONCURRENCY = 12;
const DELAY_MS    = 100;

// Download numbered asteroids 1 … MAX_IAU (JPL has up to ~875150)
const MIN_IAU = 1;
const MAX_IAU = 8500;   // gives ~8000+ total with existing 4049

// ── URL builder ───────────────────────────────────────────────────────────────
function buildUrl(iauNum) {
  const q = [
    `format=text`,
    `COMMAND='${iauNum}%3B'`,
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

// ── Parse response → CSV lines ────────────────────────────────────────────────
function parseToCSV(text, iauNum) {
  const soe = text.indexOf('$$SOE');
  const eoe = text.indexOf('$$EOE');
  if (soe < 0 || eoe < 0) throw new Error('No SOE/EOE');
  if (text.includes('DXREAD') || text.includes('out of bounds')) throw new Error('Out of bounds');

  const rows = [];
  for (const raw of text.substring(soe + 5, eoe).trim().split('\n')) {
    const line = raw.trim();
    if (!line || !/^\d/.test(line)) continue;
    const p = line.split(',').map((s) => s.trim());
    if (p.length < 5) continue;
    rows.push(`${p[0]}, ${p[1]}, ${p[2]}, ${p[3]}, ${p[4]},`);
  }
  if (rows.length < 10) throw new Error(`Only ${rows.length} rows`);
  return ['$$SOE', ...rows, '$$EOE'].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// Build list of IAU numbers to download (skip ones we already have)
const toFetch = [];
for (let n = MIN_IAU; n <= MAX_IAU; n++) {
  const spkFile = resolve(OUT_DIR, `DES=${2_000_000 + n}.csv`);
  if (!existsSync(spkFile)) toFetch.push(n);
}

console.log(`Asteroids ${MIN_IAU}–${MAX_IAU}: ${toFetch.length} to download, ${MAX_IAU - MIN_IAU + 1 - toFetch.length} already cached\n`);

let done = 0, skipped = 0, failed = 0;
const errors = [];

async function fetchOne(iauNum) {
  const outFile = resolve(OUT_DIR, `DES=${2_000_000 + iauNum}.csv`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
      const res  = await fetch(buildUrl(iauNum));
      // Retry on rate-limit or server errors
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const csv  = parseToCSV(text, iauNum);
      writeFileSync(outFile, csv, 'utf8');
      done++;
      return;
    } catch (err) {
      if (attempt === 2) {
        failed++;
        errors.push(`(${iauNum}): ${err.message.substring(0, 60)}`);
      }
    }
  }
}

const total = toFetch.length;
for (let i = 0; i < total; i += CONCURRENCY) {
  const batch = toFetch.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(fetchOne));
  const pct = Math.round(((i + batch.length) / total) * 100);
  process.stdout.write(`\r  ${i + batch.length}/${total} (${pct}%)  ✓${done}  ✗${failed}   `);
  if (i + CONCURRENCY < total) await new Promise((r) => setTimeout(r, DELAY_MS));
}

console.log(`\n\nDone. Downloaded: ${done}  Failed: ${failed}`);
if (errors.length > 0) {
  console.log(`\nFirst 20 failures:`);
  errors.slice(0, 20).forEach((e) => console.log(' ', e));
}

// Auto-rebuild binary
if (done > 0) {
  console.log('\nRebuilding binary…');
  const { execSync } = await import('node:child_process');
  execSync('node scripts/process-specific-asteroids.mjs', { cwd: ROOT, stdio: 'inherit' });
}
