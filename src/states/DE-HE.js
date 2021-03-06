import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function he (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  if (!query.prj) {
    query.prj = 'EPSG:31467'
  }
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj))

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: undefined, // duh!
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.BEANTR_GRO,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.NUTZUNG
      }
    }
  }))

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(subplots)
}
