'use strict'

module.exports = createMesh

var work = require('webworkify')
var createShader  = require('gl-shader')
var createBuffer  = require('gl-buffer')
var normals       = require('normals')
var packMesh      = require('refine-mesh/lib/mesh')
var refineMesh    = require('refine-mesh').packed
var pool          = require('typedarray-pool')

var meshWorker = work(require('./mesh-worker.js'))
var shaders = require('./shaders.js')

var MESH_ID = 0

function Mesh(
    gl,
    id,
    shader,
    positionBuffer,
    normalBuffer,
    elementBuffer,
    data) {
  this.gl             = gl
  this.id             = id
  this.shader         = shader
  this.positionBuffer = positionBuffer
  this.normalBuffer   = normalBuffer
  this.elementBuffer  = elementBuffer
  this.numElements    = 0
  this.meshData       = data
  this.pendingUpdate  = false
  this.changed        = false
}

var proto = Mesh.prototype

proto.draw = function(projection, view, pickLocation, pickRadius, pickMag) {
  var gl = this.gl

  var shader = this.shader
  shader.bind()

  var uniforms = shader.uniforms
  uniforms.projection   = projection
  uniforms.view         = view
  uniforms.pickLocation = pickLocation
  uniforms.pickRadius   = pickRadius
  uniforms.pickMag      = pickMag

  var attributes = shader.attributes
  this.positionBuffer.bind()
  attributes.position.pointer()

  this.normalBuffer.bind()
  attributes.normal.pointer()

  this.elementBuffer.bind()
  gl.drawElements(
    gl.TRIANGLES,
    this.numElements,
    gl.UNSIGNED_INT,
    0)
}

proto._update = function() {
  var meshData = this.meshData
  var numCells = meshData.numCells
  var numVerts = meshData.numVerts

  this.elementBuffer.update(meshData.cells.subarray(0, 3*numCells))
  this.positionBuffer.update(meshData.verts.subarray(0, 3*numVerts))
  this.normalBuffer.update(meshData.normals.subarray(0, 3*numVerts))

  this.numElements = 3*numCells

  this.changed = true
}

proto.deform = function(center, radius, magnitude) {
  if(this.pendingUpdate) {
    return
  }

  this.pendingUpdate = true

  var cmeshData = this.meshData
  var meshData = {
    numCells: cmeshData.numCells,
    cells:    pool.mallocInt32(cmeshData.cells.length),
    numVerts: cmeshData.numVerts,
    verts:    pool.mallocFloat32(cmeshData.verts.length),
    normals:  pool.mallocFloat32(cmeshData.normals.length)
  }

  meshData.cells.set(cmeshData.cells)
  meshData.verts.set(cmeshData.verts)
  meshData.normals.set(cmeshData.normals)

  meshWorker.postMessage({
    id:         this.id,
    center:     center,
    radius:     radius,
    magnitude:  magnitude,
    meshData:   meshData
  })
}

proto.raycast = function(origin, direction) {
  var rayDist = Infinity

  var ox = origin[0]
  var oy = origin[1]
  var oz = origin[2]

  var dx = direction[0]
  var dy = direction[1]
  var dz = direction[2]

  var meshData = this.meshData
  var numCells = meshData.numCells
  var cells = meshData.cells
  var verts = meshData.verts

  for(var i=0; i<numCells; ++i) {
    var a = cells[3*i]
    var b = cells[3*i+1]
    var c = cells[3*i+2]

    var ax = verts[3*a]
    var ay = verts[3*a+1]
    var az = verts[3*a+2]

    var bx = verts[3*b]
    var by = verts[3*b+1]
    var bz = verts[3*b+2]

    var cx = verts[3*c]
    var cy = verts[3*c+1]
    var cz = verts[3*c+2]

    var abx = bx - ax
    var aby = by - ay
    var abz = bz - az

    var acx = cx - ax
    var acy = cy - ay
    var acz = cz - az

    var nx = dy * acz - dz * acy
    var ny = dz * acx - dx * acz
    var nz = dx * acy - dy * acx

    var det = abx * nx + aby * ny + abz * nz
    if(det < 1e-6) {
      continue
    }

    var tx = ox - ax
    var ty = oy - ay
    var tz = oz - az

    var u = tx * nx + ty * ny + tz * nz
    if(u < 0 || u > det) {
      continue
    }

    var qx = ty * abz - tz * aby
    var qy = tz * abx - tx * abz
    var qz = tx * aby - ty * abx

    var v = dx * qx + dy * qy + dz * qz
    if(v < 0 || u + v > det) {
      continue
    }

    var t = (acx * qx + acy * qy + acz * qz) / det
    if(t < 0) {
      continue
    }

    rayDist = Math.min(t, rayDist)
  }

  return rayDist
}

function createMesh(gl, cells, positions) {
  var shader = createShader(gl,
    shaders.MESH_VERTEX,
    shaders.MESH_FRAGMENT)

  var positionBuffer  = createBuffer(gl)
  var normalBuffer    = createBuffer(gl)
  var elementBuffer   = createBuffer(gl, 0, gl.ELEMENT_ARRAY_BUFFER)

  var ext = gl.getExtension('OES_element_index_uint')

  var meshData = packMesh(
    cells,
    positions,
    normals.vertexNormals(
      cells,
      positions))
  refineMesh(meshData, {
    edgeLength: 0.3,
    maxIter: 20
  })

  var mesh = new Mesh(
    gl,
    MESH_ID++,
    shader,
    positionBuffer,
    normalBuffer,
    elementBuffer,
    meshData)

  mesh._update()

  meshWorker.addEventListener('message', function(ev) {
    var data = ev.data
    if(data.id !== mesh.id) {
      return
    }
    pool.free(mesh.meshData.cells)
    pool.free(mesh.meshData.verts)
    pool.free(mesh.meshData.normals)
    mesh.meshData = data.meshData
    mesh.pendingUpdate = false
    mesh._update()
  })

  return mesh
}
