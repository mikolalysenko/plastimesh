'use strict'

var refineMesh = require('refine-mesh').packed
var pool = require('typedarray-pool')

var refineOptions = {
  edgeLength: 0.3,
  maxIter: 1,
  collapseIter: 1,
  flipIter: 1,
  splitIter: 1,
  smoothIter: 1,
  smoothRate: 1
}

function applyModifier(
  center,
  radius,
  magnitude,
  numVerts,
  positions,
  normals) {

  var cx = center[0]
  var cy = center[1]
  var cz = center[2]

  var r2 = Math.pow(radius, 2)

  for(var i=0; i<numVerts; ++i) {
    var x = positions[3*i]
    var y = positions[3*i+1]
    var z = positions[3*i+2]

    var d2 = Math.pow(x-cx,2) + Math.pow(y-cy,2) + Math.pow(z-cz,2)
    if(d2 > r2) {
      continue
    }

    var w = magnitude*(1.0 - Math.sqrt(d2/r2))

    positions[3*i]   = x + w * normals[3*i]
    positions[3*i+1] = y + w * normals[3*i+1]
    positions[3*i+2] = z + w * normals[3*i+2]
  }
}

function cleanNormals(center, radius, meshData) {
  var padRadius = radius * 2.0

  var numCells = meshData.numCells
  var cells    = meshData.cells
  var numVerts = meshData.numVerts
  var verts    = meshData.verts
  var normals  = meshData.normals

  var nextNormals = pool.mallocFloat32(3 * numVerts)

  for(var i=0; i<3*numVerts; ++i) {
    nextNormals[i] = 0
  }

  var px = center[0]
  var py = center[1]
  var pz = center[2]
  var r2 = Math.pow(padRadius, 2)

  for(var i=0; i<numCells; ++i) {
    var a = cells[3*i]
    var b = cells[3*i+1]
    var c = cells[3*i+2]

    var ax = verts[3*a]
    var ay = verts[3*a+1]
    var az = verts[3*a+2]
    var da2 = Math.pow(ax-px,2) + Math.pow(ay-py,2) + Math.pow(az-pz,2)

    var bx = verts[3*b]
    var by = verts[3*b+1]
    var bz = verts[3*b+2]
    var db2 = Math.pow(bx-px,2) + Math.pow(by-py,2) + Math.pow(bz-pz,2)

    var cx = verts[3*c]
    var cy = verts[3*c+1]
    var cz = verts[3*c+2]
    var dc2 = Math.pow(cx-px,2) + Math.pow(cy-py,2) + Math.pow(cz-pz,2)

    if(Math.min(da2,db2,dc2) > r2) {
      continue
    }

    var abx = bx - ax
    var aby = by - ay
    var abz = bz - az
    var abl = 1/Math.sqrt(Math.pow(abx,2) + Math.pow(aby,2) + Math.pow(abz,2))
    abx *= abl
    aby *= abl
    abz *= abl

    var bcx = cx - bx
    var bcy = cy - by
    var bcz = cz - bz
    var bcl = 1/Math.sqrt(Math.pow(bcx,2) + Math.pow(bcy,2) + Math.pow(bcz,2))
    bcx *= bcl
    bcy *= bcl
    bcz *= bcl

    var cax = ax - cx
    var cay = ay - cy
    var caz = az - cz
    var cal = 1/Math.sqrt(Math.pow(cax,2) + Math.pow(cay,2) + Math.pow(caz,2))
    cax *= cal
    cay *= cal
    caz *= cal

    //na += ab x ca
    nextNormals[3*a]   -= aby * caz - abz * cay
    nextNormals[3*a+1] -= abz * cax - abx * caz
    nextNormals[3*a+2] -= abx * cay - aby * cax

    //nb += bc x ab
    nextNormals[3*b]   -= bcy * abz - bcz * aby
    nextNormals[3*b+1] -= bcz * abx - bcx * abz
    nextNormals[3*b+2] -= bcx * aby - bcy * abx

    //nc += ca x bc
    nextNormals[3*c]   -= cay * bcz - caz * bcy
    nextNormals[3*c+1] -= caz * bcx - cax * bcz
    nextNormals[3*c+2] -= cax * bcy - cay * bcx
  }

  for(var i=0; i<numVerts; ++i) {
    var x = verts[3*i]
    var y = verts[3*i+1]
    var z = verts[3*i+2]
    var d2 = Math.pow(x-px,2) + Math.pow(y-py,2) + Math.pow(z-pz,2)
    if(d2 > r2) {
      continue
    }

    var nx = nextNormals[3*i]
    var ny = nextNormals[3*i+1]
    var nz = nextNormals[3*i+2]
    var n2 = Math.pow(nx,2) + Math.pow(ny,2) + Math.pow(nz,2)
    if(n2 < 1e-6) {
      continue
    }

    var nl = 1/Math.sqrt(n2)
    normals[3*i]   = nx * nl
    normals[3*i+1] = ny * nl
    normals[3*i+2] = nz * nl
  }

  pool.free(nextNormals)
}

module.exports = function() {
  self.addEventListener('message', function(ev) {
    var data      = ev.data
    var center    = data.center
    var radius    = data.radius
    var magnitude = data.magnitude
    var meshData  = data.meshData

    applyModifier(
      center,
      radius,
      magnitude,
      meshData.numVerts,
      meshData.verts,
      meshData.normals)
    cleanNormals(center, radius, meshData)
    refineMesh(meshData, refineOptions)

    self.postMessage({
      id: data.id,
      meshData: meshData
    })
  })
}
