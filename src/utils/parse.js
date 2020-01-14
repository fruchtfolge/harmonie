const parser = require('fast-xml-parser')
const shapefile = require("shapefile")

module.exports = {
  async shape(shp, dbf) {
    return await shapefile.read(shp, dbf)
  },
  xml(xml) {
    return parser.parse(xml, null, true)
  }
}