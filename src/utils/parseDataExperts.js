import { getSafe } from './helpers.js'
import { XMLParser, XMLValidator } from 'fast-xml-parser'
import proj4 from 'proj4'
import { polygon } from '@turf/helpers'

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs')
const fromETRS89 = new proj4.Proj('EPSG:25832')
const toWGS84 = new proj4.Proj('WGS84')

const alwaysParseAsArrays = [
  'nn.land.parzelle',
  'wfs:FeatureCollection.gml:featureMember'
]
const options = {
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  parseAttributeValue: true,
  isArray: (name, jpath) => {
    if (alwaysParseAsArrays.indexOf(jpath) !== -1) return true
  }
}

export function parseXML (xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid XML structure.')
  const parser = new XMLParser(options)
  const json = parser.parse(xml)

  const basis = {
    applicationYear: getSafe(() => json.nn.antragsjahr),
    farmId: getSafe(() => json.nn.bnrzd),
    state: getSafe(() => json.nn.land.bezeichnung),
    fieldBlockConstant: getSafe(() => json.nn.land.feldblockkonstante),
    stateNo: getSafe(() => json.nn.land.nummer)
  }

  if (getSafe(() => json.nn.land.parzelle)) {
    return json.nn.land.parzelle.map(field => {
      return {
        ...basis,
        ...field
      }
    })
  } else {
    return new Error('No fields found in XML.')
  }
}

export function parseGML (gml) {
  if (XMLValidator.validate(gml) !== true) {
    throw new Error('Invalid GML structure.')
  }
  const parser = new XMLParser(options)
  const json = parser.parse(gml)
  if (getSafe(() => json['wfs:FeatureCollection']['gml:featureMember'])) {
    const results = []
    json['wfs:FeatureCollection']['gml:featureMember'].forEach(field => {
      const id = getSafe(() => field['elan:tschlag']['elan:SCHLAGNR'])
      const year = getSafe(() => field['elan:tschlag']['elan:WIRTSCHAFTSJAHR'])
      let coordinates = getSafe(() => field['elan:tschlag']['elan:GEO_COORD_']['gml:Polygon']['gml:outerBoundaryIs']['gml:LinearRing']['gml:coordinates'])

      if (!coordinates) return

      // split coordinate string into array of strings
      coordinates = coordinates.split(' ')
      // then into array of arrays and transform string values to numbers
      coordinates = coordinates.map(pair => {
        return pair.split(',').map(coord => {
          return Number(coord)
        })
      })

      coordinates = coordinates.map(latlng => {
        return proj4(fromETRS89, toWGS84, latlng)
      })
      const feature = polygon([coordinates], {
        number: id,
        year
      })

      return results.push({
        schlag: {
          nummer: id
        },
        geometry: feature
      })
    })

    return results
  } else {
    throw new Error('No fields found in GML.')
  }
}

export function join (xml, gml) {
  return xml.map(field => {
    const geometry = gml.find(
      // eslint-disable-next-line eqeqeq
      tschlag => tschlag.schlag.nummer == field.schlag.nummer
    )
    if (!geometry) return field
    return {
      ...geometry,
      ...field
    }
  })
}
