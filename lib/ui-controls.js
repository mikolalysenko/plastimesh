'use strict'

module.exports = createUIControlDiv

function createUIControlDiv() {
  var container = document.createElement('div')
  var containerStyle = container.style
  containerStyle.position = 'absolute'
  containerStyle.left = '0'
  containerStyle.top = '0'
  containerStyle['font-family'] = 'monospace'

  var controls = {
    radius:    0.75,
    magnitude: 1,
    container: container
  }

  var radiusP = document.createElement('p')
  var radiusSlider = document.createElement('input')
  radiusSlider.type = 'range'
  radiusSlider.min = 0.25
  radiusSlider.max = 4.0
  radiusSlider.step = 0.001
  radiusSlider.value = controls.radius

  radiusP.appendChild(document.createTextNode('0'))
  radiusP.appendChild(radiusSlider)
  radiusP.appendChild(document.createTextNode('∞'))

  var magnitudeP = document.createElement('p')
  var magnitudeSlider = document.createElement('input')
  magnitudeSlider.type = 'range'
  magnitudeSlider.min = -2
  magnitudeSlider.max =  2
  magnitudeSlider.step = 0.001
  magnitudeSlider.value = controls.magnitude

  magnitudeP.appendChild(document.createTextNode('-'))
  magnitudeP.appendChild(magnitudeSlider)
  magnitudeP.appendChild(document.createTextNode('+'))

  function controlsChanged() {
    controls.magnitude = +magnitudeSlider.value
    controls.radius = +radiusSlider.value
  }

  radiusSlider.addEventListener('change', controlsChanged)
  radiusSlider.addEventListener('input', controlsChanged)
  magnitudeSlider.addEventListener('change', controlsChanged)
  magnitudeSlider.addEventListener('input', controlsChanged)

  container.appendChild(radiusP)
  container.appendChild(magnitudeP)
  document.body.appendChild(container)

  return controls
}
