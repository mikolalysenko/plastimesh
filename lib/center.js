'use strict'

module.exports = center

var boundPoints = require('bound-points')

function center(verts) {
  var bounds = boundPoints(verts)
  var mid = [0,0,0]
  for(var i=0; i<3; ++i) {
    mid[i] = 0.5 * (bounds[0][i] + bounds[1][i])
  }
  for(var i=0; i<verts.length; ++i) {
    var p = verts[i]
    for(var j=0; j<3; ++j) {
      p[j] -= mid[j]
    }
  }
  return verts
}
