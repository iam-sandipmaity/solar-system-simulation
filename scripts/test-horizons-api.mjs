// Quick one-off test — not part of the main pipeline
// Horizons REST API wants literal single-quotes in values (not %27-encoded),
// so we build the query string manually instead of using URLSearchParams.
const base = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const q = [
  `format=text`,
  `COMMAND='699%3B'`,
  `OBJ_DATA='NO'`,
  `MAKE_EPHEM='YES'`,
  `EPHEM_TYPE='VECTORS'`,
  `CENTER='500@10'`,
  `START_TIME='2022-01-01'`,
  `STOP_TIME='2028-01-01'`,
  `STEP_SIZE='7d'`,
  `VEC_TABLE='1'`,
  `REF_PLANE='ECLIPTIC'`,
  `OUT_UNITS='KM-S'`,
  `CSV_FORMAT='YES'`,
].join('&');

const url = `${base}?${q}`;
console.log('URL:', url.substring(0, 300));
const res  = await fetch(url);
const text = await res.text();

if (!res.ok) { console.log('HTTP', res.status); console.log(text.substring(0, 1000)); process.exit(1); }
const soe = text.indexOf('$$SOE');
const eoe = text.indexOf('$$EOE');
if (soe < 0) { console.log('ERROR (no SOE):', text.substring(0, 500)); process.exit(1); }

const rows = text.substring(soe + 5, eoe).trim().split('\n').filter((l) => l.trim());
console.log('Row count:', rows.length);
console.log('First:', rows[0].substring(0, 100));
console.log('Last :', rows[rows.length - 1].substring(0, 100));

const AU    = 149597870.7;
const parts = rows[0].split(',').map((s) => s.trim());
const x = parseFloat(parts[2]) / AU;
const y = parseFloat(parts[3]) / AU;
const z = parseFloat(parts[4]) / AU;
const dist = Math.sqrt(x * x + y * y + z * z);
console.log(`\nFirst pos (ecliptic AU): X=${x.toFixed(4)} Y=${y.toFixed(4)} Z=${z.toFixed(4)}  dist=${dist.toFixed(3)} AU`);
console.log('Expected dist ~2.2-2.7 AU (main belt asteroid)');

// Also check a row near simDays=9558 (JD 2461103.5)
const J2000 = 2451545.0;
const targetJD = J2000 + 9558;
const nearRow = rows.find((r) => {
  const jd = parseFloat(r.split(',')[0]);
  return Math.abs(jd - targetJD) < 4;
});
if (nearRow) {
  const p = nearRow.split(',').map((s) => s.trim());
  const nx = parseFloat(p[2]) / AU, ny = parseFloat(p[3]) / AU, nz = parseFloat(p[4]) / AU;
  console.log(`\n2026 pos (ecliptic AU): X=${nx.toFixed(4)} Y=${ny.toFixed(4)} Z=${nz.toFixed(4)}  dist=${Math.sqrt(nx*nx+ny*ny+nz*nz).toFixed(3)} AU`);
  console.log('  Three.js: X=' + nx.toFixed(4) + ' Y=' + nz.toFixed(4) + ' Z=' + (-ny).toFixed(4));
} else {
  console.log('\nNo row near 2026 date in response');
}
