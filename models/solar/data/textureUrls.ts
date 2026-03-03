// Texture CDN URLs from Solar System Scope (free non-commercial license)
// https://www.solarsystemscope.com/textures/

const BASE = '/textures';

export const TEXTURE_URLS: Record<string, Record<string, string>> = {
  sun: {
    diffuse: `${BASE}/2k_sun.jpg`,
  },
  mercury: {
    diffuse: `${BASE}/2k_mercury.jpg`,
  },
  venus: {
    diffuse: `${BASE}/2k_venus_surface.jpg`,
    clouds:  `${BASE}/2k_venus_atmosphere.jpg`,
  },
  earth: {
    diffuse: `${BASE}/2k_earth_daymap.jpg`,
    clouds:  `${BASE}/2k_earth_clouds.jpg`,
    night:   `${BASE}/2k_earth_nightmap.jpg`,
  },
  mars: {
    diffuse: `${BASE}/2k_mars.jpg`,
  },
  jupiter: {
    diffuse: `${BASE}/2k_jupiter.jpg`,
  },
  saturn: {
    diffuse: `${BASE}/2k_saturn.jpg`,
    ring:    `${BASE}/2k_saturn_ring_alpha.png`,
  },
  uranus: {
    diffuse: `${BASE}/2k_uranus.jpg`,
  },
  neptune: {
    diffuse: `${BASE}/2k_neptune.jpg`,
  },
  moon: {
    diffuse: `${BASE}/2k_moon.jpg`,
  },
  ceres: {
    diffuse: `${BASE}/2k_ceres_fictional.jpg`,
  },
  eris: {
    diffuse: `${BASE}/2k_eris_fictional.jpg`,
  },
  haumea: {
    diffuse: `${BASE}/2k_haumea_fictional.jpg`,
  },
  makemake: {
    diffuse: `${BASE}/2k_makemake_fictional.jpg`,
  },
  milkyway: {
    diffuse: `${BASE}/2k_stars_milky_way.jpg`,
  },
  stars: {
    diffuse: `${BASE}/2k_stars.jpg`,
  },
};
