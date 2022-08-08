import { shape } from '../utils/parse.js'
import { reprojectFeature, groupByFLIK } from '../utils/geometryHelpers.js'
import queryComplete from '../utils/queryComplete.js'
import Field from '../Field.js'

export default async function sl (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  query.prj = query.prj || 'EPSG:31462'
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj))

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.JAHR,
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.GR,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.CODE_BEZ
      }
    }
  }))

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}
