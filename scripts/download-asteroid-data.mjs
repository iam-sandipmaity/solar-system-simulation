/**
 * download-asteroid-data.mjs
 *
 * Bulk-imports all asteroid CSV files from Eleanor Lutz's NASA Horizons dataset
 * (https://github.com/eleanorlutz/asteroids_atlas_of_space) using a shallow
 * sparse git clone — much faster than downloading files individually.
 *
 * What it does:
 *   1. Sparse-clones the repo (metadata + two data dirs only, no history)
 *   2. Copies all CSVs to public/specific-asteroids/inner | outer
 *   3. Runs the binary processor automatically
 *
 * Run:  node scripts/download-asteroid-data.mjs
 *   Or: npm run download-asteroids
 */

import { execSync }                                          from 'node:child_process';
import { readdirSync, copyFileSync, mkdirSync, existsSync,
         rmSync, statSync }                                  from 'node:fs';
import { resolve, join }                                     from 'node:path';
import { fileURLToPath }                                     from 'node:url';
import { dirname }                                           from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

const REPO_URL   = 'https://github.com/eleanorlutz/asteroids_atlas_of_space.git';
const CLONE_DIR  = resolve(ROOT, '.tmp-asteroid-clone');
const DEST_DIR   = resolve(ROOT, 'public', 'specific-asteroids');

const DIRS = [
  { remote: 'data/any_inner_asteroids', local: 'inner' },
  { remote: 'data/any_outer_asteroids', local: 'outer' },
];

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

// ── 1. Sparse clone ───────────────────────────────────────────────────────────
console.log('\n━━ Step 1: Sparse clone ─────────────────────────────────────────');
if (existsSync(CLONE_DIR)) {
  console.log('  Removing previous clone…');
  rmSync(CLONE_DIR, { recursive: true, force: true });
}

run(
  `git clone --depth=1 --filter=blob:none --sparse "${REPO_URL}" "${CLONE_DIR}"`,
  { cwd: ROOT },
);

// Enable sparse checkout for the two data dirs
run(
  `git sparse-checkout set ${DIRS.map((d) => d.remote).join(' ')}`,
  { cwd: CLONE_DIR },
);

// ── 2. Copy CSVs to destination ───────────────────────────────────────────────
console.log('\n━━ Step 2: Copy CSV files ───────────────────────────────────────');
let totalCopied = 0;

for (const { remote, local } of DIRS) {
  const srcDir  = join(CLONE_DIR, remote);
  const destDir = join(DEST_DIR, local);

  if (!existsSync(srcDir)) {
    console.warn(`  ⚠  Source not found: ${srcDir}`);
    continue;
  }

  mkdirSync(destDir, { recursive: true });

  const files = readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.csv'));
  console.log(`  ${local}: ${files.length} files`);

  for (const file of files) {
    copyFileSync(join(srcDir, file), join(destDir, file));
  }
  totalCopied += files.length;
}

console.log(`  ✓  Copied ${totalCopied} CSV files total`);

// ── 3. Clean up clone ─────────────────────────────────────────────────────────
console.log('\n━━ Step 3: Cleanup ──────────────────────────────────────────────');
rmSync(CLONE_DIR, { recursive: true, force: true });
console.log('  ✓  Removed temp clone');

// ── 4. Rebuild binary ─────────────────────────────────────────────────────────
console.log('\n━━ Step 4: Build binary ─────────────────────────────────────────');
run(`node "${resolve(__dirname, 'process-specific-asteroids.mjs')}"`, { cwd: ROOT });

console.log('\n✅  Done! Reload the app to see all asteroids.\n');
