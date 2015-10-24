'use strict'

var glslify = require('glslify')

module.exports = {
  MESH_VERTEX:    glslify('./shaders/mesh-vertex.glsl'),
  MESH_FRAGMENT:  glslify('./shaders/mesh-fragment.glsl')
}
