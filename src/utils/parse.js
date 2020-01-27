const parser = require('fast-xml-parser')
const shapefile = require('shapefile')
const dataExperts = require('elan-parser')

module.exports = {
  async shape (shp, dbf) {
    return shapefile.read(shp, dbf)
  },
  xml (xml) {
    return parser.parse(xml, null, true)
  },
  dataExperts (xml, gml) {
    return dataExperts.join(dataExperts.parseXML(xml), dataExperts.parseGML(gml))
  }
}
