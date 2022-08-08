import { shape } from '../utils/parse'
import { reprojectFeature, groupByFLIK } from '../utils/geometryHelpers.js'
import queryComplete from '../utils/queryComplete.js'
import Field from '../Field.js'

export default async function th (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj))

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FBI}`,
    referenceDate: undefined, // duh!
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.FL,
    FieldBlockNumber: plot.properties.FBI,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: undefined, // duh!
        Name: undefined
      }
    }
  }))

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}
