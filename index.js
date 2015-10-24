'use strict'

var bunny = require('bunny')
var createContext = require('gl-context')
var createCamera = require('3d-view-controls')
var perspective = require('gl-mat4/perspective')
var mmult = require('gl-mat4/multiply')
var minv = require('gl-mat4/invert')
var transformMat4 = require('gl-vec4/transformMat4')

var center = require('./lib/center')
var createView = require('./lib/mesh')
var createUIControls = require('./lib/ui-controls')

var canvas = document.createElement('canvas')
document.body.appendChild(canvas)
window.addEventListener('resize', require('canvas-fit')(canvas))

var controls = createUIControls()

var gl = createContext(canvas)
var meshView = createView(gl, bunny.cells, center(bunny.positions))

var camera = createCamera(canvas, {
  eye:    [0,0,20],
  center: [0,0,0],
  zoomMax: 500
})
var projectionMatrix = new Float32Array(16)

var pickLocation = [1e10,1e10,1e10]

var RAY_ORIGIN    = [0,0,0,0]
var RAY_DIRECTION = [0,0,0,0]
var MVP_INVERSE = new Float32Array(16)

function castRay() {
  RAY_DIRECTION[0] = 2.0*camera.mouse.x/window.innerWidth - 1.0
  RAY_DIRECTION[1] = 1.0 - 2.0*camera.mouse.y/window.innerHeight
  RAY_DIRECTION[2] = 1
  RAY_DIRECTION[3] = 1

  RAY_ORIGIN[0] = RAY_ORIGIN[1] = RAY_ORIGIN[2] = 0
  RAY_ORIGIN[3] = 1

  mmult(MVP_INVERSE, projectionMatrix, camera.matrix)
  minv(MVP_INVERSE, MVP_INVERSE)

  transformMat4(RAY_ORIGIN,    RAY_ORIGIN,    MVP_INVERSE)
  transformMat4(RAY_DIRECTION, RAY_DIRECTION, MVP_INVERSE)

  for(var i=0; i<3; ++i) {
    RAY_ORIGIN[i]    /= RAY_ORIGIN[3]
    RAY_DIRECTION[i] /= RAY_DIRECTION[3]
    RAY_DIRECTION[i] -= RAY_ORIGIN[i]
  }

  var rayT = meshView.raycast(RAY_ORIGIN, RAY_DIRECTION)

  if(rayT < Infinity) {
    for(var i=0; i<3; ++i) {
      pickLocation[i] = RAY_ORIGIN[i] + rayT * RAY_DIRECTION[i]
    }
    return true
  }

  pickLocation[0] = pickLocation[1] = pickLocation[2] = 1e10

  return false
}

function render() {
  requestAnimationFrame(render)
  camera.tick()
  if(castRay() && (camera.mouse.buttons&1)) {
    meshView.deform(
      pickLocation,
      controls.radius,
      controls.magnitude)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.enable(gl.DEPTH_TEST)
  perspective(
    projectionMatrix,
    Math.PI/4,
    canvas.width/canvas.height,
    0.01,
    1000)
  meshView.draw(
    projectionMatrix,
    camera.matrix,
    pickLocation,
    controls.radius,
    controls.magnitude)
}
render()
