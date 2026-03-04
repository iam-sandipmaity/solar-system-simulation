# Solar System Simulation

A physics-accurate, photorealistic 3D solar system built with real NASA/ESA orbital data, rendered in the browser using WebGL.

![Solar System Simulation](public/textures/)

## Features

- **8 planets + dwarf planets** — accurate semi-major axes, eccentricities, inclinations, and axial tilts
- **Keplerian orbits** — positions solved via Kepler's equation (iterative Newton–Raphson), not circular approximations
- **Asteroid belt** — 5,000 dust particles + 150 instanced rock meshes placed at the real 2.06–3.27 AU boundaries (Kirkwood gaps)
- **Satellite systems** — moons rendered with correct orbital inclinations and periods
- **PBR textures** — high-resolution albedo, normal, specular, and cloud maps for each body
- **Atmosphere glow** — shader-based atmospheric scattering (toggleable)
- **Axial rotation** — all bodies spin at correct sidereal rotation rates
- **Time controls** — scrub from 1 second/s up to 1 year/s; pause and reset
- **Camera presets** — 45°, top-down, side, front, and free-look modes
- **Focus mode** — camera tracks the selected planet or satellite
- **Settings panel** — toggle orbits, atmosphere, rotation, satellite orbits, belt, and rendering quality

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 14.2 | App framework, routing, SSR |
| [React](https://react.dev) | 18.3 | UI components |
| [Three.js](https://threejs.org) | 0.168 | 3D rendering engine |
| [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) | 8.17 | React renderer for Three.js |
| [@react-three/drei](https://github.com/pmndrs/drei) | 9.113 | Helpers (OrbitControls, useTexture, etc.) |
| [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) | 2.16 | Bloom, depth of field |
| [Zustand](https://zustand-demo.pmnd.rs) | 4.5.5 | Global UI state |
| [simplex-noise](https://github.com/jwagner/simplex-noise) | 4.0.3 | Procedural asteroid placement |
| TypeScript | 5 | Type safety |

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install & Run

```bash
git clone https://github.com/iam-sandipmaity/solar-system-simulation.git
cd solar-system-simulation
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Controls

| Input | Action |
|---|---|
| Left-drag | Rotate camera |
| Scroll wheel | Zoom in / out |
| Right-drag | Pan |
| Click planet | Open info panel + focus |
| Click background | Deselect, return to Sun |

## Project Structure

```
simulation/
├── app/
│   ├── page.tsx          # Home / landing page
│   ├── layout.tsx        # Root layout (fonts, metadata)
│   ├── icon.svg          # Favicon (auto-detected by Next.js)
│   └── solar/            # /solar route — the 3D simulation
│
├── models/solar/
│   ├── SolarCanvas.tsx   # <Canvas> setup, postprocessing
│   ├── SolarSystem.tsx   # Scene root — composes all bodies
│   ├── SolarStore.ts     # Zustand store (selection, toggles, camera)
│   │
│   ├── components/
│   │   ├── Sun.tsx        # Star with corona shader
│   │   ├── Planet.tsx     # Generic planet (PBR, atmosphere, rings)
│   │   ├── Moon.tsx       # Earth's moon
│   │   ├── Satellite.tsx  # Generic satellite / moon
│   │   ├── AsteroidBelt.tsx
│   │   ├── OrbitPath.tsx
│   │   └── Starfield.tsx
│   │
│   ├── controls/
│   │   ├── CameraController.tsx  # OrbitControls + focus tracking
│   │   └── TimeControls.tsx      # Play/pause/speed UI
│   │
│   ├── data/
│   │   ├── planetData.ts         # Orbital elements for all bodies
│   │   ├── physicsConstants.ts   # AU_KM, DISTANCE_SCALE, etc.
│   │   └── satelliteData.ts
│   │
│   ├── physics/
│   │   └── OrbitalMechanics.ts   # Kepler solver, orbit point generation
│   │
│   ├── shaders/                  # GLSL vertex/fragment shaders
│   │
│   └── ui/
│       ├── HUD.tsx               # Top bar + back button
│       ├── InfoPanel.tsx         # Planet details sidebar
│       ├── Settings.tsx          # Display & camera settings
│       └── CameraViewPanel.tsx
│
└── public/
    ├── textures/                 # Planet/moon texture maps
    └── data/                     # Any static JSON data
```

## Physics

- **Distance scale**: `1 km = 1/1,000,000 visual units` → Earth–Sun ≈ 149.6 units
- **Kepler's equation**: `M = E − e·sin(E)` solved iteratively (10 iterations)
- **Orbital speed**: derived from `T = 365.25 × a^1.5` days (period proportional to semi-major axis^1.5)
- **Asteroid belt**: real boundaries 2.06 AU (4:1 Kirkwood gap) to 3.27 AU (2:1 Kirkwood gap)

## Texture Credits

- Planet textures — [Solar System Scope](https://www.solarsystemscope.com/textures/)
- Rock texture (asteroid belt) — [Poly Haven](https://polyhaven.com) — `Rock035`
- Reference data — [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)

---

## Named Asteroids — Real Ephemeris Tracking

The simulation supports **individually tracked named asteroids** using real XYZ Cartesian
position data from NASA's Horizons system (pre-processed by Eleanor Lutz's
[asteroids_atlas_of_space](https://github.com/eleanorlutz/asteroids_atlas_of_space) dataset).

Each asteroid's position is linearly interpolated from daily ephemeris samples and rendered
as a clickable, trackable body in the 3D scene — exactly like planets and moons.

### Quick Start

```bash
# Download all ~8 000 asteroid CSV files and build the binary in one command:
npm run download-asteroids
```

Reload the app. The **NAMED ASTEROIDS** section appears at the bottom of the Planets panel.

---

### How It Works

#### 1 · Data source

Files come from
[github.com/eleanorlutz/asteroids_atlas_of_space](https://github.com/eleanorlutz/asteroids_atlas_of_space),
subdirectories `data/any_inner_asteroids` (3 000 files) and `data/any_outer_asteroids`
(5 000 files).

Each CSV is a NASA Horizons vector table:

```
JDTDB, Calendar Date (TDB), X, Y, Z,
2450827.377..., A.D. 1998-Jan-13 ..., -6.09E+08, 2.24E+08, -1.31E+06,
...
```

- Positions in **kilometres**, heliocentric ecliptic J2000 frame
- Sampled **daily**, typically covering 1997–2007 (~3 652 rows per file)
- File name encodes the SPK-ID: `DES=+2000699.csv` → asteroid **(699)**

#### 2 · Processing pipeline

```
public/specific-asteroids/
  inner/   DES=+2000699.csv  …   (inner solar system)
  outer/   DES=+2002624.csv  …   (outer solar system)
```

```bash
node scripts/process-specific-asteroids.mjs
```

For each CSV the script:

1. Parses `JDTDB`, `X`, `Y`, `Z`
2. Converts km → AU (`÷ 149 597 870.7`)
3. Stores `jdOffset = JD − 2451545.0` (days from J2000, same units as `simulationDays`)
4. Subsamples every **7 days** (reduces file size ~7× with no visible orbit error)
5. Extracts the display name: `DES=+2000699` → `(699)`

##### Binary format (`specific-asteroids.bin`)

```
UInt32LE  N          — number of asteroids
For each asteroid:
  UInt8   nameLen
  n bytes name (ASCII, e.g. "(699)")
  UInt32LE  M        — sample count
  M × [Float32LE jdOffset, Float32LE x_au, Float32LE y_au, Float32LE z_au]
```

| Metric | Value |
|---|---|
| Asteroids | 8 000 |
| Samples per asteroid | ~522 (every 7 days over ~10 years) |
| Total samples | ~4 170 000 |
| File size | **21 MB** |

#### 3 · Runtime interpolation

Every frame `SpecificAsteroids.tsx`:

1. Loads `specific-asteroids.bin` once on mount
2. Uses `simulationDays` from `useTimeStore`
3. For each asteroid: binary-searches the sample array for the two bracketing
   time indices, then **linearly interpolates** X/Y/Z
4. Handles out-of-range times by **looping** the data window so asteroids always
   display even when the simulation clock is set to 2026

```
looped_day = start + ((simDays − start) % span + span) % span
```

5. Writes world positions into `asteroidPositions: Map<name, THREE.Vector3>`
   (read by `CameraController` for tracking)
6. Updates an `InstancedMesh` (all asteroids in one draw call)

#### 4 · Selecting & tracking

| Action | Result |
|---|---|
| Click an asteroid in the Planets panel | Camera zooms to it and tracks |
| Click the asteroid's shape in the 3D scene | Same |
| Click again / press ✕ in info panel | Deselect |
| Select a planet or satellite | Asteroid deselected automatically |

The **info panel** (bottom-right) shows:
- Asteroid number, e.g. `(699)`
- Live distance from the Sun in AU
- Number of data samples
- Ephemeris date range

---

### Adding More / Custom Asteroids

Drop any Horizons XYZ CSV (vector table, km) into any subfolder of
`public/specific-asteroids/` and re-run:

```bash
npm run process-specific-asteroids
```

The script recurses all subdirectories automatically.

To get a Horizons file for any object:

1. Go to [ssd.jpl.nasa.gov/horizons/app.html](https://ssd.jpl.nasa.gov/horizons/app.html)
2. **Target body** — enter asteroid name or SPK-ID
3. **Observer** — `@0` (Solar System Barycenter)
4. **Table type** — Vectors
5. **Output units** — km and km/s
6. Download as CSV and save as `DES=+<SPKID>.csv`

---

### Scripts Reference

| Script | Command | Description |
|---|---|---|
| `download-asteroid-data.mjs` | `npm run download-asteroids` | Sparse-clones the GitHub repo, copies all 8 000 CSVs, builds binary |
| `process-specific-asteroids.mjs` | `npm run process-specific-asteroids` | Converts CSVs in `public/specific-asteroids/**` to binary |

## License

MIT
