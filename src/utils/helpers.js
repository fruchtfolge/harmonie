import parse from './parse'
import { multiPolygon } from '@turf/helpers'
import { coordEach } from '@turf/meta'
import proj4 from 'proj4'
import polygonClipping from 'polygon-clipping'
import { parse as wktParse } from 'terraformer-wkt-parser'

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs')
// DE-MV
proj4.defs('EPSG:5650', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=33500000 +y_0=0 +ellps=GRS80 +units=m +no_defs')
// DE-HE
proj4.defs('EPSG:31467', '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs')

const fromETRS89 = new proj4.Proj('EPSG:25832')
const toWGS84 = new proj4.Proj('WGS84')

export default {
  toLetter (number) {
    if (!isNaN(number) && number >= 0 && number <= 26) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
      return alphabet[number]
    }
    return 'a'
  },
  toGeoJSON (gml, projection) {
    // convert gml to json
    const json = parse.xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    const flatJson = this.flatten(json)
    const polygonArray = Object.keys(flatJson).map(k => {
      return this.toCoordinates(flatJson[k], projection)
    }).filter(c => c[0])
    return multiPolygon(polygonArray)
  },
  toPairs (array) {
    return array.reduce((result, value, index, array) => {
      if (index % 2 === 0) { result.push(array.slice(index, index + 2)) }
      return result
    }, [])
  },
  toWGS84 (coordPair, projection) {
    if (coordPair.length !== 2) return
    if (projection) projection = new proj4.Proj(projection)
    else projection = fromETRS89
    return proj4(projection, toWGS84, coordPair)
  },
  toCoordinates (string, projection, keepProjection) {
    const numbers = string.split(/\s+/g).map(s => Number(s)).filter(n => !isNaN(n))
    let coords = this.toPairs(numbers)
    if (!keepProjection) {
      coords = coords.map(c => this.toWGS84(c, projection))
    }
    return coords
  },
  flatten (ob) {
    const toReturn = {}
    for (const i in ob) {
      if (!(i in ob)) continue
      if ((typeof ob[i]) === 'object') {
        const flatObject = this.flatten(ob[i])
        for (const x in flatObject) {
          if (!(x in flatObject)) continue
          toReturn[i + '.' + x] = flatObject[x]
        }
      } else {
        toReturn[i] = ob[i]
      }
    }
    return toReturn
  },
  wktToGeoJSON (wkt) {
    let geojson = wktParse(wkt)
    geojson = this.reprojectFeature(geojson)
    return geojson
  },
  reprojectFeature (feature, projection) {
    if (projection) projection = new proj4.Proj(projection)
    else projection = fromETRS89
    coordEach(feature, coord => {
      const p = proj4(projection, toWGS84, coord)
      coord.length = 0
      coord.push(...p)
    })
    return feature
  },
  getSafe (value, defVal) {
    try {
      return value()
    } catch (e) {
      return defVal
    }
  },
  groupByFLIK (fields) {
    // create an object where each fieldblock the farm operates on is a key
    // with the fields in that fieldblock being the properties
    const groups = this.groupBy(fields, 'FieldBlockNumber')
    let curNo = 0
    const reNumberedFields = []
    Object.keys(groups).forEach(fieldBlock => {
      // if there's only one field in the fieldblock, we just re-assign its field
      // number and go on
      const fieldsInFieldBlock = groups[fieldBlock]
      if (fieldsInFieldBlock.length === 1) {
        fieldsInFieldBlock[0].NumberOfField = curNo
        fieldsInFieldBlock[0].PartOfField = 0
        reNumberedFields.push(fieldsInFieldBlock[0])
        curNo++
      } else {
        // unfortunately, we cannot be sure if the two fields from a fieldblock
        // are acutally part of a single field, as it may happen that a farmer has
        // two fields in the same fieldblock, while another farmer owns the field
        // in between these other fields.
        // we therefore need to check if the fields would form a union or not
        const union = polygonClipping.union(...fieldsInFieldBlock.map(f => f.SpatialData.geometry.coordinates))
        // the features do not form a single union, we therefore assume they
        // cannot be joined to single field

        if (this.getSafe(() => union.geometry.length) > 1) {
          fieldsInFieldBlock.forEach(field => {
            field.NumberOfField = curNo
            field.PartOfField = 0
            reNumberedFields.push(field)
            curNo++
          })
        } else {
          fieldsInFieldBlock.forEach((field, i) => {
            field.NumberOfField = curNo
            field.PartOfField = i
            reNumberedFields.push(field)
          })
          curNo++
        }
      }
    })
    return reNumberedFields
  },
  groupBy (xs, key) {
    return xs.reduce((rv, x) => {
      (rv[x[key]] = rv[x[key]] || []).push(x)
      return rv
    }, {})
  }
}
