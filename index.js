'use strict'

var bunny         = require('bunny')
var createContext = require('gl-context')

var center            = require('./lib/center')
var createView        = require('./lib/mesh')
var createUIControls  = require('./lib/ui-controls')
var createCamera      = require('./lib/camera')

var canvas = document.createElement('canvas')
document.body.appendChild(canvas)
window.addEventListener('resize', require('canvas-fit')(canvas))

var gl = createContext(canvas)
var meshView = createView(gl, bunny.cells, center(bunny.positions))

var camera = createCamera(canvas, {
  eye:    [0,0,20],
  center: [0,0,0],
  zoomMax: 500,
  raycast: function(origin, direction) {
    return meshView.raycast(origin, direction)
  }
})

var controls = createUIControls()

function render() {
  requestAnimationFrame(render)
  if(camera.tick() || meshView.changed) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)

    meshView.draw(
      camera.projectionMatrix,
      camera.matrix,
      camera.hitLocation,
      controls.radius,
      controls.magnitude)

    meshView.changed = false
  }

  if(camera.sculptMode) {
    meshView.deform(
      camera.hitLocation,
      controls.radius,
      controls.magnitude)
  }
}
render()
