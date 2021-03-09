import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function sl (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // if a projection was passed, check if it is supported
  const supportedProjs = ['EPSG:25832', 'EPSG:5650', 'EPSG:31467', 'EPSG:31462', 'EPSG:31468', 'EPSG:25833', 'EPSG:4647']
  if (query.projection && !query.prj) {
    if (supportedProjs.indexOf(query.projection) === -1) {
      throw new Error(`Projection ${query.projection} is not supported by harmonie. The supported projections are: ${supportedProjs}`)
    }
    query.prj = query.projection
  }
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj))

  // as we don't know anything about the structure of the shape files,
  // we just make some assumptions based on the following information
  //
  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.ANTJAHR,
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.AKT_FL,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.KC_GEM,
        Name: undefined
      }
    }
  }))

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(subplots)
}
