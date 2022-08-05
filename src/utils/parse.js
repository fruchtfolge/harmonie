import { XMLParser } from 'fast-xml-parser'
import { read } from 'shapefile'
import { join, parseXML, parseGML } from 'elan-parser'

export default {
  async shape (shp, dbf) {
    return read(shp, dbf)
  },
  xml (xml) {
    const parser = new XMLParser({ ignoreAttributes: false }, true)
    return parser.parse(xml, true)
  },
  dataExperts (xml, gml) {
    return join(parseXML(xml), parseGML(gml))
  }
}
