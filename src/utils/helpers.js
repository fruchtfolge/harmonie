const parse = require('./parse')
const turf = require('@turf/helpers')
const proj4 = require('proj4')

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs')
const fromETRS89 = new proj4.Proj('EPSG:25832')
const toWGS84 = new proj4.Proj('WGS84')

module.exports = {
  toLetter (number) {
    if (!isNaN(number) && number >= 0 && number <= 26) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
      return alphabet[number]
    }
    return 'a'
  },
  toGeoJSON (gml) {
    // convert gml to json
    const json = parse.xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    const flatJson = this.flatten(json)
    const polygonArray = Object.keys(flatJson).map(k => {
      return this.toCoordinates(flatJson[k])
    })
    return turf.multiPolygon(polygonArray)
  },
  toPairs (array) {
    return array.reduce((result, value, index, array) => {
      if (index % 2 === 0) { result.push(array.slice(index, index + 2)) }
      return result
    }, [])
  },
  toCoordinates (string, keepProjection) {
    const numbers = string.split(/\s+/g).map(s => Number(s))
    let coords = this.toPairs(numbers)
    if (!keepProjection) {
      coords = coords.map(latlng => {
        return proj4(fromETRS89, toWGS84, latlng)
      })
    }
    return coords
  },
  flatten (ob) {
    var toReturn = {}
    for (var i in ob) {
      if (!(i in ob)) continue
      if ((typeof ob[i]) === 'object') {
        var flatObject = this.flatten(ob[i])
        for (var x in flatObject) {
          if (!(x in flatObject)) continue
          toReturn[i + '.' + x] = flatObject[x]
        }
      } else {
        toReturn[i] = ob[i]
      }
    }
    return toReturn
  }
}
