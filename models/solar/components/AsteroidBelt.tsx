'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useTimeStore } from '../physics/TimeScale';
import { DISTANCE_SCALE, AU_KM } from '../data/physicsConstants';

// ── Visual scale ──────────────────────────────────────────────────────────────
const AU = AU_KM * DISTANCE_SCALE; // ~149.598 visual units per AU

// ── Kirkwood resonance gaps (Jupiter mean-motion commensurabilities) ──────────
// These are the real orbital resonance gaps observed in the asteroid belt.
// Particle density drops sharply at these AU values.
const KIRKWOOD_GAPS = [
  { center: 2.06, halfWidth: 0.040 }, // 4:1 resonance – inner edge of main belt
  { center: 2.50, halfWidth: 0.055 }, // 3:1 resonance – largest gap (Hestia gap)
  { center: 2.82, halfWidth: 0.045 }, // 5:2 resonance
  { center: 2.96, halfWidth: 0.038 }, // 7:3 resonance
  { center: 3.27, halfWidth: 0.040 }, // 2:1 resonance – outer edge of main belt
];

function inKirkwoodGap(r_au: number): boolean {
  return KIRKWOOD_GAPS.some(g => Math.abs(r_au - g.center) < g.halfWidth);
}

function sampleAU(minAU: number, maxAU: number, avoidGaps = false): number {
  let r: number;
  let tries = 0;
  do {
    r = minAU + Math.random() * (maxAU - minAU);
    tries++;
    if (tries > 40) break;
  } while (avoidGaps && inKirkwoodGap(r));
  return r;
}

/** Keplerian angular speed in rad / simulated-day (Kepler's 3rd law) */
function keplerSpeed(r_au: number): number {
  return (2 * Math.PI) / (365.25 * Math.pow(r_au, 1.5));
}

/** Random point in a toroidal belt band */
function beltPoint(minAU: number, maxAU: number, heightAU: number, avoidGaps = false) {
  const angle = Math.random() * Math.PI * 2;
  const r_au  = sampleAU(minAU, maxAU, avoidGaps);
  const r     = r_au * AU;
  const y     = (Math.random() - 0.5) * heightAU * AU;
  return { x: Math.cos(angle) * r, y, z: Math.sin(angle) * r, r, r_au, angle };
}

// ── Scientifically accurate asteroid type color palette ───────────────────────
// Based on actual spectroscopic data from NASA/JPL:
//
// C-type (Carbonaceous) – 75% of belt, outer regions, very dark grey
//   Real colour: near-black to dark charcoal grey, albedo 0.03–0.09
//
// S-type (Silicaceous/Stony) – 17% of belt, inner regions, reddish-brown
//   Real colour: greenish to reddish-brown (silicate minerals + nickel-iron)
//   albedo 0.10–0.22
//
// M-type (Metallic) – ~5% of belt, middle regions, slightly reddish metallic
//   Real colour: muted reddish-grey (nickel-iron), albedo 0.10–0.18
//
// D-type (Dark primitive) – outer belt & Trojans, very dark reddish-brown
//   albedo 0.02–0.05
//
// V-type (Vestoids from Vesta) – inner belt, bright grey-white basaltic
//   albedo 0.20–0.48

// ── Per-family particle group definitions ─────────────────────────────────────
interface GroupDef {
  label:     string;
  count:     number;
  minAU:     number;
  maxAU:     number;
  heightAU:  number;
  color:     string;
  opacity:   number;
  size:      number;
  avoidGaps: boolean;
  // Orbital eccentricity: real asteroid orbits are slightly elliptical (~0.07–0.20)
  eccentricityRange: [number, number];
}

const BELT_GROUPS: GroupDef[] = [
  // ── Near-Earth Asteroids – S-type sparse, reddish-grey ──────────────────
  {
    label: 'NEA', count: 400, minAU: 0.50, maxAU: 1.30,
    heightAU: 0.12, color: '#8B6B50', opacity: 0.50, size: 0.55,
    avoidGaps: false, eccentricityRange: [0.10, 0.40],
  },
  // ── Hungaria group – E-type bright enstatite ──────────────────────────
  {
    label: 'Hungaria', count: 350, minAU: 1.78, maxAU: 2.00,
    heightAU: 0.10, color: '#A89070', opacity: 0.45, size: 0.58,
    avoidGaps: false, eccentricityRange: [0.05, 0.18],
  },
  // ── Inner edge haze – very sparse transition into belt ────────────────
  {
    label: 'InnerEdgeHaze', count: 900, minAU: 1.90, maxAU: 2.20,
    heightAU: 0.22, color: '#9B7455', opacity: 0.07, size: 0.80,
    avoidGaps: false, eccentricityRange: [0.05, 0.20],
  },
  // ── Inner Main Belt – S-type dominant (2.06–2.50 AU) ─────────────────
  {
    label: 'InnerBelt_S', count: 3200, minAU: 2.06, maxAU: 2.50,
    heightAU: 0.13, color: '#B07850', opacity: 0.60, size: 0.62,
    avoidGaps: true, eccentricityRange: [0.05, 0.20],
  },
  // ── Inner Belt S-type red variant ─────────────────────────────────────
  {
    label: 'InnerBelt_S_red', count: 1500, minAU: 2.06, maxAU: 2.50,
    heightAU: 0.13, color: '#9A5030', opacity: 0.45, size: 0.55,
    avoidGaps: true, eccentricityRange: [0.05, 0.20],
  },
  // ── Inner Belt V-type (Vestoids) – bright grey-white basaltic ─────────
  {
    label: 'InnerBelt_V', count: 300, minAU: 2.10, maxAU: 2.48,
    heightAU: 0.10, color: '#C8B8A0', opacity: 0.60, size: 0.55,
    avoidGaps: true, eccentricityRange: [0.05, 0.15],
  },
  // ── Middle Belt M-type (metallic nickel-iron) ─────────────────────────
  {
    label: 'MiddleBelt_M', count: 1000, minAU: 2.50, maxAU: 2.82,
    heightAU: 0.14, color: '#907860', opacity: 0.52, size: 0.60,
    avoidGaps: true, eccentricityRange: [0.05, 0.18],
  },
  // ── Middle Belt C-type beginning to dominate ──────────────────────────
  {
    label: 'MiddleBelt_C', count: 2500, minAU: 2.50, maxAU: 2.82,
    heightAU: 0.14, color: '#6A6560', opacity: 0.50, size: 0.60,
    avoidGaps: true, eccentricityRange: [0.05, 0.18],
  },
  // ── Outer Belt C-type dominant (dark carbonaceous) ────────────────────
  {
    label: 'OuterBelt_C_dark', count: 2800, minAU: 2.82, maxAU: 3.27,
    heightAU: 0.16, color: '#585450', opacity: 0.48, size: 0.62,
    avoidGaps: true, eccentricityRange: [0.05, 0.22],
  },
  // ── Outer Belt D-type (primitive, dark reddish) ───────────────────────
  {
    label: 'OuterBelt_D', count: 800, minAU: 2.90, maxAU: 3.27,
    heightAU: 0.16, color: '#6A4838', opacity: 0.42, size: 0.56,
    avoidGaps: true, eccentricityRange: [0.05, 0.22],
  },
  // ── Cybele group (3.27–3.70 AU) – C/D-type, sparse ───────────────────
  {
    label: 'Cybele', count: 600, minAU: 3.27, maxAU: 3.70,
    heightAU: 0.16, color: '#524E4A', opacity: 0.38, size: 0.58,
    avoidGaps: false, eccentricityRange: [0.05, 0.20],
  },
  // ── Outer edge haze: gradual density falloff beyond Cybele ────────────
  {
    label: 'OuterEdgeHaze', count: 1000, minAU: 3.20, maxAU: 4.00,
    heightAU: 0.28, color: '#4A4540', opacity: 0.06, size: 0.75,
    avoidGaps: false, eccentricityRange: [0.05, 0.25],
  },
  // ── Diffuse bridge Cybele → Hildas (very faint) ───────────────────────
  {
    label: 'CybeleHildaBridge', count: 500, minAU: 3.68, maxAU: 4.20,
    heightAU: 0.22, color: '#423E3A', opacity: 0.05, size: 0.70,
    avoidGaps: false, eccentricityRange: [0.05, 0.22],
  },
];

// ── Hilda group (3:2 resonance, ~3.7–4.2 AU) ─────────────────────────────────
const HILDA_COUNT       = 600;
const HILDA_MIN_AU      = 3.70;
const HILDA_MAX_AU      = 4.20;
const HILDA_HEIGHT_AU   = 0.12;
const HILDA_LOBE_SPREAD = 0.55;
const HILDA_ROCK_COUNT  = 120; // instanced irregular rocks inside the triangle

// ── Jupiter Trojans (L4 Greeks +60°, L5 Trojans -60°) ────────────────────────
// D-type dominant: very dark, reddish-brown, primitive composition
const JUPITER_REF_ANGLE      = Math.PI * 0.7;
const TROJAN_COUNT_PER_CLOUD = 800;
const TROJAN_MIN_AU          = 4.90;
const TROJAN_MAX_AU          = 5.50;
const TROJAN_HEIGHT_AU       = 0.20;
const TROJAN_ANGULAR_SPREAD  = 0.65;
const TROJAN_ROCK_COUNT      = 160; // instanced rocks split across L4 + L5

// ── Instanced rock mesh config ────────────────────────────────────────────────
// We use custom irregular polyhedra-like shapes by applying random vertex
// displacement to base geometries – this eliminates flat rectangular faces.
const ROCKS_PER_TYPE = 80;
const ROCK_COUNT     = ROCKS_PER_TYPE * 4; // 4 geometry types × 80 = 320

// Asteroid type distribution for instanced meshes:
// Type 0: Icosahedron (angular, 20-face) displaced → C-type dark grey
// Type 1: Octahedron (spiky, 8-face) displaced → S-type reddish-brown
// Type 2: Dodecahedron (rounded, 12-face) displaced → M-type metallic
// Type 3: Tetrahedron-based irregular → small mixed type

type RockState = {
  r:          number;
  y:          number;
  angle:      number;
  rotX:       number;
  rotY:       number;
  rotZ:       number;
  sx:         number; // non-uniform scale for irregular shape
  sy:         number;
  sz:         number;
  orbitSpeed: number;
  spinSpeed:  number;
  spinAxisX:  number; // tumbling axis (real asteroids tumble chaotically)
  spinAxisZ:  number;
  typeIdx:    number;
  r_au:       number; // stored for zone-color lookup
};

/**
 * Generate random non-uniform scale axes to simulate irregular asteroid shapes.
 * Real asteroids are elongated, flattened, or lumpy – never cube/box shaped.
 * This produces potato-shaped, elongated, and irregular morphologies.
 * Base is intentionally large so individual rocks are visible from medium zoom.
 */
function randomAsteroidScale(): [number, number, number] {
  const base = 1.5 + Math.random() * 3.0; // 1.5–4.5 units base before axis deform
  const shapeType = Math.random();

  if (shapeType < 0.25) {
    // Highly elongated "cigar" shape (like Eros, Itokawa)
    return [
      base * (1.8 + Math.random() * 1.4),
      base * (0.5 + Math.random() * 0.4),
      base * (0.6 + Math.random() * 0.5),
    ];
  } else if (shapeType < 0.50) {
    // Flattened "pancake" shape
    return [
      base * (0.8 + Math.random() * 0.6),
      base * (0.3 + Math.random() * 0.35),
      base * (0.9 + Math.random() * 0.5),
    ];
  } else if (shapeType < 0.75) {
    // "Potato" shape – moderately irregular
    return [
      base * (0.9 + Math.random() * 0.7),
      base * (0.65 + Math.random() * 0.55),
      base * (1.1 + Math.random() * 0.7),
    ];
  } else {
    // "Rubble pile" – nearly spherical but lumpy (Ryugu, Bennu style)
    return [
      base * (0.85 + Math.random() * 0.35),
      base * (0.80 + Math.random() * 0.40),
      base * (0.82 + Math.random() * 0.38),
    ];
  }
}

/**
 * Displace vertices of a geometry randomly to break regularity.
 * This transforms clean icosahedra/octahedra into lumpy irregular rocks
 * rather than perfect mathematical solids.
 */
function displacedGeo(baseGeo: THREE.BufferGeometry, displaceMag = 0.18): THREE.BufferGeometry {
  const geo = baseGeo.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const dx = (Math.random() - 0.5) * displaceMag;
    const dy = (Math.random() - 0.5) * displaceMag;
    const dz = (Math.random() - 0.5) * displaceMag;
    pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ── Geometry builders ─────────────────────────────────────────────────────────
function buildGroupPositions(g: GroupDef): Float32Array {
  const pos = new Float32Array(g.count * 3);
  for (let i = 0; i < g.count; i++) {
    const p = beltPoint(g.minAU, g.maxAU, g.heightAU, g.avoidGaps);
    pos[i * 3]     = p.x;
    pos[i * 3 + 1] = p.y;
    pos[i * 3 + 2] = p.z;
  }
  return pos;
}

function buildHildaLobe(count: number, centreAngle: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = centreAngle + (Math.random() - 0.5) * HILDA_LOBE_SPREAD * 2;
    const r_au  = HILDA_MIN_AU + Math.random() * (HILDA_MAX_AU - HILDA_MIN_AU);
    const r     = r_au * AU;
    const y     = (Math.random() - 0.5) * HILDA_HEIGHT_AU * AU;
    pos[i * 3]     = Math.cos(angle) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(angle) * r;
  }
  return pos;
}

function buildTrojanCloud(count: number, centreAngle: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = centreAngle + (Math.random() - 0.5) * TROJAN_ANGULAR_SPREAD * 2;
    const r_au  = TROJAN_MIN_AU + Math.random() * (TROJAN_MAX_AU - TROJAN_MIN_AU);
    const r     = r_au * AU;
    const y     = (Math.random() - 0.5) * TROJAN_HEIGHT_AU * AU;
    pos[i * 3]     = Math.cos(angle) * r;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(angle) * r;
  }
  return pos;
}

// ── Derive zone color from orbital radius ────────────────────────────────────
// Each AU zone has a characteristic color matching its dominant asteroid type.
// Used for both per-instance InstancedMesh tinting and particle hues.
function zoneColor(r_au: number): THREE.Color {
  if (r_au < 2.30) return new THREE.Color('#B8724A'); // inner: warm S-type orange-brown
  if (r_au < 2.60) return new THREE.Color('#A08060'); // inner-mid: muted orange-tan
  if (r_au < 2.82) return new THREE.Color('#887870'); // middle: grey-beige M/C mix
  if (r_au < 3.10) return new THREE.Color('#605855'); // outer-mid: dark grey C-type
  if (r_au < 4.30) return new THREE.Color('#4A3828'); // Hilda: D-type dark reddish-brown
  return new THREE.Color('#3A2418');                  // Trojan: very dark primitive D-type
}

/** Pick a random position inside one of the three Hilda lobes. */
function randomHildaPos() {
  const lobeCenter = Math.floor(Math.random() * 3) * (2 * Math.PI / 3);
  const angle = lobeCenter + (Math.random() - 0.5) * HILDA_LOBE_SPREAD * 2;
  const r_au  = HILDA_MIN_AU + Math.random() * (HILDA_MAX_AU - HILDA_MIN_AU);
  const r     = r_au * AU;
  const y     = (Math.random() - 0.5) * HILDA_HEIGHT_AU * AU;
  return { r, r_au, angle, y };
}

/** Pick a random position inside the L4 or L5 Trojan cloud. */
function randomTrojanPos() {
  const centre = JUPITER_REF_ANGLE + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 3;
  const angle  = centre + (Math.random() - 0.5) * TROJAN_ANGULAR_SPREAD * 2;
  const r_au   = TROJAN_MIN_AU + Math.random() * (TROJAN_MAX_AU - TROJAN_MIN_AU);
  const r      = r_au * AU;
  const y      = (Math.random() - 0.5) * TROJAN_HEIGHT_AU * AU;
  return { r, r_au, angle, y };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AsteroidBelt({ visible = true }: { visible?: boolean }) {
  const rockTexture = useLoader(TextureLoader, '/textures/Rock035.jpg');

  // ── Canvas circle texture: makes every point sprite a soft round disc ─────
  // WebGL renders gl_PointSize as axis-aligned SQUARES by default.
  // Binding a radial-gradient CanvasTexture as `map` clips each sprite into
  // a circle, eliminating the rectangular box appearance.
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0,    'rgba(255,255,255,1.00)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.65, 'rgba(255,255,255,0.50)');
    grad.addColorStop(0.85, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1.0,  'rgba(255,255,255,0.00)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }, []);



  // ── Per-group particle geometries ────────────────────────────────────────
  const groupGeometries = useMemo(() =>
    BELT_GROUPS.map(g => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(buildGroupPositions(g), 3));
      return geo;
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ── Hilda triangle (three lobes at 0°, 120°, 240° – D-type dark) ─────────
  const hildaGeo = useMemo(() => {
    const n   = Math.floor(HILDA_COUNT / 3);
    const a0  = buildHildaLobe(n, 0);
    const a1  = buildHildaLobe(n, (2 * Math.PI) / 3);
    const a2  = buildHildaLobe(HILDA_COUNT - 2 * n, (4 * Math.PI) / 3);
    const buf = new Float32Array(a0.length + a1.length + a2.length);
    buf.set(a0, 0); buf.set(a1, a0.length); buf.set(a2, a0.length + a1.length);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    return geo;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Jupiter Trojans L4 + L5 (D-type: very dark reddish-brown) ────────────
  const trojanGeo = useMemo(() => {
    const l4  = buildTrojanCloud(TROJAN_COUNT_PER_CLOUD, JUPITER_REF_ANGLE + Math.PI / 3);
    const l5  = buildTrojanCloud(TROJAN_COUNT_PER_CLOUD, JUPITER_REF_ANGLE - Math.PI / 3);
    const buf = new Float32Array(l4.length + l5.length);
    buf.set(l4, 0); buf.set(l5, l4.length);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    return geo;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Four displaced base geometries for irregular rock shapes ─────────────
  // Using vertex displacement to break the regularity of polyhedra so they
  // look like real cratered, irregular asteroid shapes (not boxes or spheres).
  const [icoGeo, octGeo, dodGeo, tetraGeo] = useMemo(() => {
    return [
      // C-type: displaced icosahedron – dark grey, cratered appearance
      displacedGeo(new THREE.IcosahedronGeometry(0.80, 1), 0.22),
      // S-type: displaced octahedron – reddish stony, spiky/angular
      displacedGeo(new THREE.OctahedronGeometry(0.85, 1), 0.25),
      // M-type: displaced dodecahedron – metallic grey, slightly rounded
      displacedGeo(new THREE.DodecahedronGeometry(0.75, 0), 0.20),
      // Mixed small: low-poly icosahedron – very irregular rubble pile
      displacedGeo(new THREE.IcosahedronGeometry(0.70, 0), 0.30),
    ];
  }, []);

  // ── Hilda instanced rock states ───────────────────────────────────────────
  const hildaRockStates = useMemo<RockState[]>(() =>
    Array.from({ length: HILDA_ROCK_COUNT }, () => {
      const { r, r_au, angle, y } = randomHildaPos();
      const [sx, sy, sz] = randomAsteroidScale();
      return {
        r, y, angle, r_au,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        sx, sy, sz,
        orbitSpeed: keplerSpeed(r_au),
        spinSpeed:  0.15 + Math.random() * 1.2,
        spinAxisX:  (Math.random() - 0.5) * 0.4,
        spinAxisZ:  (Math.random() - 0.5) * 0.3,
        typeIdx: 0,
      };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ── Trojan instanced rock states ──────────────────────────────────────────
  const trojanRockStates = useMemo<RockState[]>(() =>
    Array.from({ length: TROJAN_ROCK_COUNT }, () => {
      const { r, r_au, angle, y } = randomTrojanPos();
      const [sx, sy, sz] = randomAsteroidScale();
      return {
        r, y, angle, r_au,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        sx, sy, sz,
        orbitSpeed: keplerSpeed(r_au),
        spinSpeed:  0.10 + Math.random() * 1.0,
        spinAxisX:  (Math.random() - 0.5) * 0.4,
        spinAxisZ:  (Math.random() - 0.5) * 0.3,
        typeIdx: 0,
      };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // ── Rock states: distribute across C/S/M/mixed types ─────────────────────
  const rockStates = useMemo<RockState[]>(() =>
    Array.from({ length: ROCK_COUNT }, (_, i) => {
      const typeIdx = Math.floor(i / ROCKS_PER_TYPE); // 0=C-type, 1=S-type, 2=M-type, 3=mixed

      // Distribute asteroid types by belt region matching real observations:
      // S-type (idx=1) → inner belt 2.06–2.50 AU
      // M-type (idx=2) → middle belt 2.50–2.82 AU
      // C-type (idx=0,3) → outer belt 2.50–3.27 AU (C predominates outer)
      let minAU: number, maxAU: number;
      if (typeIdx === 1) {
        // S-type concentrated in inner belt
        minAU = 2.06; maxAU = 2.50;
      } else if (typeIdx === 2) {
        // M-type concentrated in middle belt
        minAU = 2.50; maxAU = 2.82;
      } else {
        // C-type spread across full belt, dominant outer
        minAU = 2.06; maxAU = 3.27;
      }

      const r_au  = sampleAU(minAU, maxAU, true);
      const r     = r_au * AU;
      const angle = Math.random() * Math.PI * 2;
      const y     = (Math.random() - 0.5) * 0.12 * AU;
      const [sx, sy, sz] = randomAsteroidScale();

      return {
        r, y, angle,
        rotX:      Math.random() * Math.PI * 2,
        rotY:      Math.random() * Math.PI * 2,
        rotZ:      Math.random() * Math.PI * 2,
        sx, sy, sz,
        orbitSpeed: keplerSpeed(r_au),
        // Real asteroid spin periods: 2–12 hours for most, some as fast as minutes
        spinSpeed:  0.2 + Math.random() * 1.8,
        // Tumbling rotation axes – real asteroids don't spin on clean axes
        spinAxisX:  (Math.random() - 0.5) * 0.4,
        spinAxisZ:  (Math.random() - 0.5) * 0.3,
        typeIdx,
        r_au,
      };
    }),
  []);

  // Four InstancedMesh refs – main belt (one per geometry type)
  const meshRef0 = useRef<THREE.InstancedMesh>(null!); // C-type dark
  const meshRef1 = useRef<THREE.InstancedMesh>(null!); // S-type reddish
  const meshRef2 = useRef<THREE.InstancedMesh>(null!); // M-type metallic
  const meshRef3 = useRef<THREE.InstancedMesh>(null!); // mixed small
  // Outer region InstancedMesh refs
  const meshRefHilda  = useRef<THREE.InstancedMesh>(null!); // Hilda D-type
  const meshRefTrojan = useRef<THREE.InstancedMesh>(null!); // Trojan D-type
  const dummy    = useMemo(() => new THREE.Object3D(), []);

  const applyRock = useCallback((s: RockState, mesh: THREE.InstancedMesh, localIdx: number) => {
    dummy.position.set(Math.cos(s.angle) * s.r, s.y, Math.sin(s.angle) * s.r);
    dummy.rotation.set(s.rotX, s.rotY, s.rotZ);
    dummy.scale.set(s.sx, s.sy, s.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(localIdx, dummy.matrix);
  }, [dummy]);

  // Set initial rock transforms + per-instance zone tint colour
  useEffect(() => {
    const refs = [meshRef0.current, meshRef1.current, meshRef2.current, meshRef3.current];
    if (refs.some(r => !r)) return;
    const counts = [0, 0, 0, 0];
    rockStates.forEach(s => {
      const localIdx = counts[s.typeIdx]++;
      applyRock(s, refs[s.typeIdx], localIdx);
      refs[s.typeIdx].setColorAt(localIdx, zoneColor(s.r_au));
    });
    refs.forEach(m => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rockStates]);

  // Hilda rocks – initial transforms + zone tint
  useEffect(() => {
    const m = meshRefHilda.current;
    if (!m) return;
    hildaRockStates.forEach((s, i) => {
      applyRock(s, m, i);
      m.setColorAt(i, zoneColor(s.r_au));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hildaRockStates]);

  // Trojan rocks – initial transforms + zone tint
  useEffect(() => {
    const m = meshRefTrojan.current;
    if (!m) return;
    trojanRockStates.forEach((s, i) => {
      applyRock(s, m, i);
      m.setColorAt(i, zoneColor(s.r_au));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trojanRockStates]);

  // Animate: Keplerian orbit + tumbling self-rotation (all rock groups)
  useFrame((_, delta) => {
    if (!visible) return;
    const timeScale = useTimeStore.getState().timeScale;
    const dtDays    = (delta * timeScale) / 86_400;

    // Main belt rocks
    const refs   = [meshRef0.current, meshRef1.current, meshRef2.current, meshRef3.current];
    const counts = [0, 0, 0, 0];
    if (refs.every(r => r)) {
      rockStates.forEach(s => {
        s.angle += s.orbitSpeed * dtDays;
        s.rotY  += s.spinSpeed  * delta;
        s.rotX  += s.spinAxisX  * s.spinSpeed * delta;
        s.rotZ  += s.spinAxisZ  * s.spinSpeed * delta;
        applyRock(s, refs[s.typeIdx], counts[s.typeIdx]++);
      });
      refs.forEach(m => { m.instanceMatrix.needsUpdate = true; });
    }

    // Hilda rocks
    const mh = meshRefHilda.current;
    if (mh) {
      hildaRockStates.forEach((s, i) => {
        s.angle += s.orbitSpeed * dtDays;
        s.rotY  += s.spinSpeed  * delta;
        s.rotX  += s.spinAxisX  * s.spinSpeed * delta;
        s.rotZ  += s.spinAxisZ  * s.spinSpeed * delta;
        applyRock(s, mh, i);
      });
      mh.instanceMatrix.needsUpdate = true;
    }

    // Trojan rocks
    const mt = meshRefTrojan.current;
    if (mt) {
      trojanRockStates.forEach((s, i) => {
        s.angle += s.orbitSpeed * dtDays;
        s.rotY  += s.spinSpeed  * delta;
        s.rotX  += s.spinAxisX  * s.spinSpeed * delta;
        s.rotZ  += s.spinAxisZ  * s.spinSpeed * delta;
        applyRock(s, mt, i);
      });
      mt.instanceMatrix.needsUpdate = true;
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* ── Main belt particle groups – scientifically colour-coded ──────── */}
      {BELT_GROUPS.map((g, idx) => (
        <points key={g.label} geometry={groupGeometries[idx]}>
          <pointsMaterial
            map={circleTexture}
            alphaTest={0.05}
            color={g.color}
            size={g.size}
            opacity={g.opacity}
            transparent
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      ))}

      {/* ── Hilda triangle (D-type: very dark, slightly reddish-brown) ───── */}
      <points geometry={hildaGeo}>
        <pointsMaterial
          map={circleTexture}
          alphaTest={0.05}
          color="#4A3828"
          size={0.46}
          opacity={0.50}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points geometry={hildaGeo}>
        <pointsMaterial
          map={circleTexture}
          alphaTest={0.05}
          color="#3D2E20"
          size={0.90}
          opacity={0.08}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* ── Jupiter Trojans L4+L5 (D-type: primitive dark reddish-brown) ── */}
      <points geometry={trojanGeo}>
        <pointsMaterial
          map={circleTexture}
          alphaTest={0.05}
          color="#523020"
          size={0.50}
          opacity={0.54}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <points geometry={trojanGeo}>
        <pointsMaterial
          map={circleTexture}
          alphaTest={0.05}
          color="#3E2418"
          size={0.92}
          opacity={0.09}
          transparent
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* ── Instanced rocks type 0 – angular 20-face (ICO) ─────────────────
           Material base is WHITE so the per-instance zoneColor from
           setColorAt multiplies through exactly as the zone's hue.
           Texture tints on top give surface detail (craters, facets).     */}
      <instancedMesh ref={meshRef0} args={[icoGeo, undefined, ROCKS_PER_TYPE]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.97}
          metalness={0.02}
          color="#ffffff"
        />
      </instancedMesh>

      {/* ── Instanced rocks type 1 – spiky 8-face (OCT) ──────────────────── */}
      <instancedMesh ref={meshRef1} args={[octGeo, undefined, ROCKS_PER_TYPE]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.93}
          metalness={0.05}
          color="#ffffff"
        />
      </instancedMesh>

      {/* ── Instanced rocks type 2 – rounded 12-face (DOD) ───────────────── */}
      <instancedMesh ref={meshRef2} args={[dodGeo, undefined, ROCKS_PER_TYPE]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.80}
          metalness={0.22}
          color="#ffffff"
        />
      </instancedMesh>

      {/* ── Instanced rocks type 3 – lumpy low-poly (ICO-0) ──────────────── */}
      <instancedMesh ref={meshRef3} args={[tetraGeo, undefined, ROCKS_PER_TYPE]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.96}
          metalness={0.03}
          color="#ffffff"
        />
      </instancedMesh>

      {/* ── Hilda triangle rocks – D-type dark reddish-brown, heavily displaced ─
           Positioned inside the three co-rotating Hilda lobes (~3.7–4.2 AU).
           Per-instance zoneColor paints each rock the correct D-type hue.     */}
      <instancedMesh ref={meshRefHilda} args={[tetraGeo, undefined, HILDA_ROCK_COUNT]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.97}
          metalness={0.02}
          color="#ffffff"
        />
      </instancedMesh>

      {/* ── Jupiter Trojan rocks – very dark primitive D-type (~4.9–5.5 AU) ───
           Split across L4 (Greeks) and L5 (Trojans) clouds at ±60° from
           Jupiter's current longitude. Per-instance color = near-black D-type. */}
      <instancedMesh ref={meshRefTrojan} args={[dodGeo, undefined, TROJAN_ROCK_COUNT]} frustumCulled={false}>
        <meshStandardMaterial
          map={rockTexture}
          roughness={0.98}
          metalness={0.01}
          color="#ffffff"
        />
      </instancedMesh>
    </group>
  );
}