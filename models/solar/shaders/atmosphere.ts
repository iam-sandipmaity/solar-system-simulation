// GLSL: Atmosphere scattering shader (Rayleigh approximation)
export const atmosphereVertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */`
  uniform vec3 atmosphereColor;
  uniform float atmosphereIntensity;
  uniform vec3 sunDirection;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);

    // Fresnel rim for limb glow
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 3.5) * atmosphereIntensity;

    // Day-side scattering boost
    vec3 worldNormal = normalize(vNormal);
    float dayFactor = max(dot(worldNormal, normalize(sunDirection)), 0.0);
    float glow = rim * (0.4 + 0.6 * dayFactor);

    gl_FragColor = vec4(atmosphereColor * glow, glow * 0.85);
  }
`;
