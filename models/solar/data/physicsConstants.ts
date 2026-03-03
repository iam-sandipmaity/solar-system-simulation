// Gravitational constant
export const G = 6.674e-11; // m³ kg⁻¹ s⁻²

// Astronomical Unit in km
export const AU_KM = 149_597_870.7;

// Solar mass
export const SOLAR_MASS = 1.989e30; // kg

// Default time scale: 1 real second = 1 Earth day
export const DEFAULT_TIME_SCALE = 86_400;

// Visual scaling
export const DISTANCE_SCALE = 1 / 1_000_000; // 1 km = 1e-6 visual units
export const SIZE_SCALE_EXPONENT = 1.0;       // true linear → perfect size ratios between all bodies
export const SIZE_SCALE_FACTOR = 5e-6;        // 1 km = 5e-6 visual units  (Jupiter ≈ 0.35, Earth ≈ 0.032)

// Minimum visual radius (only needed for bodies like Phobos/Deimos that are genuinely tiny)
export const MIN_VISUAL_RADIUS = 0.006;
