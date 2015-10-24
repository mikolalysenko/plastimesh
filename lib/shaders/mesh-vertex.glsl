precision mediump float;

attribute vec3 position, normal;
uniform mat4 projection, view;
uniform vec3 pickLocation;
uniform float pickRadius, pickMag;

varying vec3 fragColor;

void main() {
  vec3 pickColor = mix(
    vec3(0.1,0.8,2.0),
    vec3(2.0,0.8,0.1),
    0.5 + 0.5*pickMag);
  float pickWeight = max(
    1.0 - distance(pickLocation, position) / pickRadius, 0.0);
  fragColor = mix(
      0.5 + 0.3 * normal,
      pickColor - 0.4*(0.5 + 0.5 * normal), pickWeight);
  gl_Position = projection * view *
    vec4(position + normal * pickWeight * pickMag, 1);
}
