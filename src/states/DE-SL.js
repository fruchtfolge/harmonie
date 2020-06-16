import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function sl (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, 'EPSG:31462'))

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
  return helpers.groupByFLIK(subplots)
}
