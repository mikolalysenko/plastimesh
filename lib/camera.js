'use strict'

module.exports = createCamera

var now         = require('right-now')
var createView  = require('3d-view')
var mouseChange = require('mouse-change')
var mouseWheel  = require('mouse-wheel')
var perspective = require('gl-mat4/perspective')
var mmult       = require('gl-mat4/multiply')
var minv        = require('gl-mat4/invert')
var transformMat4 = require('gl-vec4/transformMat4')

function createCamera(element, options) {
  element = element || document.body
  options = options || {}

  var rayCastScene = options.raycast || function() { return Infinity }

  var limits  = [ 0.01, Infinity ]
  if('distanceLimits' in options) {
    limits[0] = options.distanceLimits[0]
    limits[1] = options.distanceLimits[1]
  }
  if('zoomMin' in options) {
    limits[0] = options.zoomMin
  }
  if('zoomMax' in options) {
    limits[1] = options.zoomMax
  }

  var view = createView({
    center: options.center || [0,0,0],
    up:     options.up     || [0,1,0],
    eye:    options.eye    || [0,0,10],
    mode:   options.mode   || 'orbit',
    distanceLimits: limits
  })

  var pmatrix = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  var distance = 0.0
  var width   = element.clientWidth
  var height  = element.clientHeight

  var projectionMatrix = pmatrix.slice()

  var HIT_LOCATION  = [0,0,0]
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

    var rayT = rayCastScene(RAY_ORIGIN, RAY_DIRECTION)

    if(rayT < Infinity) {
      for(var i=0; i<3; ++i) {
        HIT_LOCATION[i] = RAY_ORIGIN[i] + rayT * RAY_DIRECTION[i]
      }
      camera.rayHit = true
    } else {
      HIT_LOCATION[0] = HIT_LOCATION[1] = HIT_LOCATION[2] = 1e10
      camera.rayHit = false
    }
  }

  var PREV_HIT = [1e10,1e10,1e10]

  var camera = {
    enable:             true,
    rayHit:             false,
    sculptMode:         false,
    hitLocation:        HIT_LOCATION,
    fov:                options.fov ||  Math.PI/4,
    zNear:              0.001,
    zFar:               1000.0,
    view:               view,
    element:            element,
    projectionMatrix:   projectionMatrix,
    delay:              options.delay          || 16,
    rotateSpeed:        options.rotateSpeed    || 1,
    zoomSpeed:          options.zoomSpeed      || 1,
    translateSpeed:     options.translateSpeed || 1,
    flipX:              !!options.flipX,
    flipY:              !!options.flipY,
    modes:              view.modes,
    tick: function() {
      var t = now()
      var delay = this.delay
      view.idle(t-delay)
      view.flush(t-(100+delay*2))
      var ctime = t - 2 * delay
      view.recalcMatrix(ctime)
      var allEqual = true
      var matrix = view.computedMatrix
      for(var i=0; i<16; ++i) {
        allEqual = allEqual && (pmatrix[i] === matrix[i])
        pmatrix[i] = matrix[i]
      }
      var sizeChanged =
          element.clientWidth === width &&
          element.clientHeight === height
      width  = element.clientWidth
      height = element.clientHeight
      perspective(
        camera.projectionMatrix,
        camera.fov,
        width/height,
        camera.zNear,
        camera.zFar)
      castRay()

      if(!camera.sculptMode && camera.mouse.buttons) {
        HIT_LOCATION[0] = HIT_LOCATION[1] = HIT_LOCATION[2] = 1e10
      }

      if(allEqual &&
         PREV_HIT[0] === HIT_LOCATION[0] &&
         PREV_HIT[1] === HIT_LOCATION[1] &&
         PREV_HIT[2] === HIT_LOCATION[2]) {
        return !sizeChanged
      }
      PREV_HIT[0] = HIT_LOCATION[0]
      PREV_HIT[1] = HIT_LOCATION[1]
      PREV_HIT[2] = HIT_LOCATION[2]
      distance = Math.exp(view.computedRadius[0])
      return true
    },
    lookAt: function(center, eye, up) {
      view.lookAt(view.lastT(), center, eye, up)
    },
    rotate: function(pitch, yaw, roll) {
      view.rotate(view.lastT(), pitch, yaw, roll)
    },
    pan: function(dx, dy, dz) {
      view.pan(view.lastT(), dx, dy, dz)
    },
    translate: function(dx, dy, dz) {
      view.translate(view.lastT(), dx, dy, dz)
    }
  }

  Object.defineProperties(camera, {
    matrix: {
      get: function() {
        return view.computedMatrix
      },
      set: function(mat) {
        view.setMatrix(view.lastT(), mat)
        return view.computedMatrix
      },
      enumerable: true
    },
    mode: {
      get: function() {
        return view.getMode()
      },
      set: function(mode) {
        view.setMode(mode)
        return view.getMode()
      },
      enumerable: true
    },
    center: {
      get: function() {
        return view.computedCenter
      },
      set: function(ncenter) {
        view.lookAt(view.lastT(), ncenter)
        return view.computedCenter
      },
      enumerable: true
    },
    eye: {
      get: function() {
        return view.computedEye
      },
      set: function(neye) {
        view.lookAt(view.lastT(), null, neye)
        return view.computedEye
      },
      enumerable: true
    },
    up: {
      get: function() {
        return view.computedUp
      },
      set: function(nup) {
        view.lookAt(view.lastT(), null, null, nup)
        return view.computedUp
      },
      enumerable: true
    },
    distance: {
      get: function() {
        return distance
      },
      set: function(d) {
        view.setDistance(view.lastT(), d)
        return d
      },
      enumerable: true
    },
    distanceLimits: {
      get: function() {
        return view.getDistanceLimits(limits)
      },
      set: function(v) {
        view.setDistanceLimits(v)
        return v
      },
      enumerable: true
    }
  })

  element.addEventListener('contextmenu', function(ev) {
    if(!camera.enable) {
      return
    }
    ev.preventDefault()
    return false
  })

  var lastX = 0, lastY = 0, lastButtons = 0
  camera.mouse = mouseChange(element, function(buttons, x, y, mods) {
    var scale = 1.0 / element.clientHeight
    var dx    = scale * (x - lastX)
    var dy    = scale * (y - lastY)

    var flipX = camera.flipX ? 1 : -1
    var flipY = camera.flipY ? 1 : -1

    var drot  = Math.PI * camera.rotateSpeed

    var t = now()

    if(buttons===1 && lastButtons===0) {
      if(camera.rayHit) {
        camera.sculptMode = true
      } else {
        camera.sculptMode = false
      }
    } else if(buttons&(~lastButtons)) {
      camera.sculptMode = false
    }

    if(!camera.sculptMode) {
      if(buttons & 1) {
        if(mods.shift) {
          view.rotate(t, 0, 0, -dx * drot)
        } else {
          view.rotate(t, flipX * drot * dx, -flipY * drot * dy, 0)
        }
      } else if(buttons & 2) {
        view.pan(t, -camera.translateSpeed * dx * distance, camera.translateSpeed * dy * distance, 0)
      } else if(buttons & 4) {
        var kzoom = camera.zoomSpeed * dy / window.innerHeight * (t - view.lastT()) * 50.0
        view.pan(t, 0, 0, distance * (Math.exp(kzoom) - 1))
      }
    }

    if(!(buttons&1)) {
      camera.sculptMode = false
    }

    lastX = x
    lastY = y
    lastButtons = buttons
  })

  mouseWheel(element, function(dx, dy, dz) {
    var flipX = camera.flipX ? 1 : -1
    var flipY = camera.flipY ? 1 : -1
    var t = now()
    if(Math.abs(dx) > Math.abs(dy)) {
      view.rotate(t, 0, 0, -dx * flipX * Math.PI * camera.rotateSpeed / window.innerWidth)
    } else {
      var kzoom = camera.zoomSpeed * flipY * dy / window.innerHeight * (t - view.lastT()) / 100.0
      view.pan(t, 0, 0, distance * (Math.exp(kzoom) - 1))
    }
  }, true)

  return camera
}
