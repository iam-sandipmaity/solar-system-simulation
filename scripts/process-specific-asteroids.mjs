/**
 * process-specific-asteroids.mjs
 *
 * Converts individual NASA Horizons ephemeris CSV files (one per asteroid)
 * from  public/specific-asteroids/*.csv   into a single compact binary:
 *       public/specific-asteroids/specific-asteroids.bin
 *
 * ── Input CSV format (Horizons X Y Z table) ──────────────────────────────────
 *   JDTDB, Calendar Date (TDB), X, Y, Z,
 *   2451159.2451..., A.D. 1998-Dec-11 17:53:00.0000, -2.38E+08, -2.77E+08, -2.33E+07,
 *
 *   X / Y / Z are in kilometres (heliocentric ecliptic J2000).
 *
 * ── Binary output format ─────────────────────────────────────────────────────
 *   Bytes 0–3          : UInt32LE  – asteroid count N
 *   For each asteroid:
 *     1 byte           : UInt8     – nameLen
 *     nameLen bytes    : ASCII     – display name  e.g. "(699)" or "DES=2002135"
 *     4 bytes          : UInt32LE  – sampleCount M
 *     M × 16 bytes     : M × 4 × Float32LE  [jdOffset, x_au, y_au, z_au]
 *       jdOffset = JD − 2451545.0  (days from J2000.0, same units as simulationDays)
 *       x/y/z in AU
 *
 * ── How to add data ───────────────────────────────────────────────────────────
 *   Drop DES=+XXXXXXX.csv files (Horizons format) into
 *   public/specific-asteroids/ and re-run this script.
 *
 * Run:  node scripts/process-specific-asteroids.mjs
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, basename }                                   from 'node:path';
import { fileURLToPath }                                       from 'node:url';
import { dirname }                                             from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const INPUT_DIR = resolve(ROOT, 'public', 'specific-asteroids');
const OUTPUT    = resolve(INPUT_DIR, 'specific-asteroids.bin');

const AU_KM    = 149_597_870.7;
const J2000_JD = 2_451_545.0;
const STRIDE   = 7;   // keep 1 sample per STRIDE days — reduces file size ~7×
                      // Orbits are still perfectly smooth at 7-day resolution

// ── Name extraction from Horizons filename ────────────────────────────────────
// DES=+2000699.csv  →  (699)       (SPK-ID 200NNNN = asteroid #NNNN)
// DES=+2002624.csv  →  (2624)
// DES=+3006278.csv  →  3006278      (comet / other: keep raw ID)
function extractName(filename) {
  const base = basename(filename, '.csv').replace(/^DES=\+?/, '').trim();
  if (/^2\d{6}$/.test(base)) {
    // Numbered asteroid: SPK-ID 2000001 → asteroid (1)
    const num = parseInt(base.substring(1), 10);
    return `(${num})`;
  }
  return base;
}

// ── Horizons ephemeris parser ─────────────────────────────────────────────────
function parseHorizons(content) {
  const lines   = content.split(/\r?\n/);
  const samples = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip any header / footer lines that don't start with a digit
    if (!/^\d/.test(line)) continue;

    // Split on comma – Horizons format: JD, DateStr, X, Y, Z[, extras…]
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length < 5) continue;

    const jd = parseFloat(parts[0]);
    const x  = parseFloat(parts[2]);
    const y  = parseFloat(parts[3]);
    const z  = parseFloat(parts[4]);

    if (!isFinite(jd) || !isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

    samples.push({
      jdOffset: jd - J2000_JD,      // days from J2000 (matches simulationDays)
      x_au:     x / AU_KM,
      y_au:     y / AU_KM,
      z_au:     z / AU_KM,
    });
  }

  // Ensure chronological order, then subsample
  samples.sort((a, b) => a.jdOffset - b.jdOffset);
  return STRIDE <= 1 ? samples : samples.filter((_, i) => i % STRIDE === 0);
}

// ── Discover CSV files (recursive) ───────────────────────────────────────────
function findCsvFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = resolve(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...findCsvFiles(full));
      } else if (entry.toLowerCase().endsWith('.csv')) {
        results.push(full);
      }
    } catch { /* skip unreadable entries */ }
  }
  return results.sort();
}

let files;
try {
  statSync(INPUT_DIR);
} catch {
  console.error(`✘  Directory not found: ${INPUT_DIR}`);
  console.error('   Create it and add Horizons CSV files, then re-run.');
  process.exit(1);
}

files = findCsvFiles(INPUT_DIR);

if (files.length === 0) {
  console.warn('⚠  No CSV files found in', INPUT_DIR);
  console.warn('   Add DES=+XXXXXXX.csv files (Horizons X Y Z table) and re-run.');
  // Write an empty binary so the app can still load without crashing
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0, 0);
  writeFileSync(OUTPUT, buf);
  process.exit(0);
}

// ── Process each file ─────────────────────────────────────────────────────────
// Use a Map to deduplicate by display name.
// Selection priority:
//   1. Data that covers the simulation epoch (J2000 + 7000 days = ~2019+) wins
//      over data that doesn't, regardless of sample count.
//   2. If both or neither cover the epoch, the higher sample count wins.
const J2000_SIM_EPOCH = 7000;   // days from J2000 — any data reaching here is "modern"
const asteroidMap = new Map();  // name → { name, samples }
let   totalSamples = 0;

function isModern(samples) {
  if (samples.length === 0) return false;
  return samples[samples.length - 1].jdOffset >= J2000_SIM_EPOCH;
}

for (const file of files) {
  const filePath = resolve(INPUT_DIR, file);
  const content  = readFileSync(filePath, 'utf8');
  const samples  = parseHorizons(content);

  if (samples.length === 0) {
    console.warn(`  ⚠  ${file} – no valid samples, skipping`);
    continue;
  }

  const name = extractName(file);
  const existing = asteroidMap.get(name);
  const newIsModern = isModern(samples);
  const exIsModern  = existing ? isModern(existing.samples) : false;

  const prefer = !existing
    || (newIsModern && !exIsModern)                          // new covers sim epoch, old doesn't
    || (newIsModern === exIsModern && samples.length > existing.samples.length);  // same modernity → more samples

  if (prefer) {
    asteroidMap.set(name, { name, samples });
    console.log(`  ✓  ${file}  →  "${name}"  (${samples.length} samples${newIsModern ? ', modern' : ', historic'})`);
  } else {
    console.log(`  ↷  ${file}  →  "${name}"  skipped (${samples.length} vs ${existing.samples.length} existing)`);
  }
}

const asteroids = [...asteroidMap.values()];
totalSamples = asteroids.reduce((s, a) => s + a.samples.length, 0);

// ── Build binary ──────────────────────────────────────────────────────────────
//   4 header + sum of (1+nameLen+4 + sampleCount×16) per asteroid
const headerBytes = 4;
const asteroidMeta = asteroids.map(({ name, samples }) => ({
  nameBytes: Buffer.from(name, 'ascii'),
  samples,
}));

let byteLength = headerBytes;
for (const { nameBytes, samples } of asteroidMeta) {
  byteLength += 1 + nameBytes.length + 4 + samples.length * 16;
}

const buf = Buffer.allocUnsafe(byteLength);
let offset = 0;

buf.writeUInt32LE(asteroids.length, offset);
offset += 4;

for (const { nameBytes, samples } of asteroidMeta) {
  buf.writeUInt8(nameBytes.length, offset);
  offset += 1;
  nameBytes.copy(buf, offset);
  offset += nameBytes.length;

  buf.writeUInt32LE(samples.length, offset);
  offset += 4;

  for (const { jdOffset, x_au, y_au, z_au } of samples) {
    buf.writeFloatLE(jdOffset, offset); offset += 4;
    buf.writeFloatLE(x_au,    offset); offset += 4;
    buf.writeFloatLE(y_au,    offset); offset += 4;
    buf.writeFloatLE(z_au,    offset); offset += 4;
  }
}

writeFileSync(OUTPUT, buf);

const mb = (buf.length / 1024 / 1024).toFixed(2);
console.log(`\n✔  Wrote ${asteroids.length} asteroids  (${totalSamples.toLocaleString()} total samples)  →  specific-asteroids.bin  (${mb} MB)`);
