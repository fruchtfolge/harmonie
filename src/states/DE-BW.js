import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function bw (query) {
  const incomplete = queryComplete(query, ['xml', 'shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(helpers.reprojectFeature)
  // parse the individual field information
  const data = parse.xml(query.xml)
  let applicationYear, subplotsRawData
  // try to access the subplots from the xml
  try {
    applicationYear = data['fsv:FSV']['fsv:FSVHeader']['commons:Antragsjahr']
    subplotsRawData = data['fsv:FSV']['fsv:FSVTable']['fsv:FSVTableRow']
    // only consider plots that have a geometry attached
    subplotsRawData = subplotsRawData.filter(plot => plot['fsvele:Geometrie'])
  } catch (e) {
    throw new Error('Error in XML data structure. Is this file the correct file from FSV BW?')
  }
  const subplots = subplotsRawData.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['fsvele:FLIK']}`,
    referenceDate: applicationYear,
    NameOfField: plot['commons:Bezeichnung'],
    NumberOfField: plot['fsvele:SchlagNummer'],
    Area: plot['fsvele:NutzflaecheMitLandschaftselement']['#text'],
    FieldBlockNumber: plot['fsvele:FLIK'],
    PartOfField: '',
    SpatialData: plot['fsvele:GeometrieId'],
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot['fsvele:CodeDerKultur'],
        Name: ''
      }
    }
  }))
  // in BW some fields are having multiple entries in the raw XML, despite only
  // having a single geometry attached
  // we now group the fields by similar geometries and re-evaluate
  const grouped = helpers.groupBy(subplots, 'SpatialData')
  const cleanedPlots = []
  Object.keys(grouped).forEach(geometryId => {
    const fieldsWithSameId = grouped[geometryId]
    if (fieldsWithSameId.length > 1) {
      for (var i = 1; i < fieldsWithSameId.length; i++) {
        fieldsWithSameId[0].Area += fieldsWithSameId[i].Area
      }
    }
    // replace geometry id with actualy geometry
    fieldsWithSameId[0].SpatialData = geometries.features.find(f => f.properties.geo_id)
    cleanedPlots.push(fieldsWithSameId[0])
  })
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(cleanedPlots)
}
