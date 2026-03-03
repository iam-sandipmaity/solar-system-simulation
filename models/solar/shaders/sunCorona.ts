// GLSL: Sun Corona / Glow shader
export const sunCoronaVertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sunCoronaFragmentShader = /* glsl */`
  uniform float time;
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.5);

    // Animate the corona with a subtle pulse
    float pulse = 0.92 + 0.08 * sin(time * 1.3);

    gl_FragColor = vec4(glowColor * rim * pulse, rim * 0.75);
  }
`;
