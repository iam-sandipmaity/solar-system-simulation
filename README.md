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

## License

MIT
