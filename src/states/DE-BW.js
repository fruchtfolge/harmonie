import { shape, xml } from '../utils/parse.js'
import { reprojectFeature, groupBy, groupByFLIK } from '../utils/geometryHelpers.js'
import queryComplete from '../utils/queryComplete.js'
import Field from '../Field.js'
import truncate from '@turf/truncate'

export default async function bw (query) {
  const incomplete = queryComplete(query, ['xml', 'shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf)
  // reproject coordinates into web mercator
  query.prj = query.prj || 'GEOGCS["ETRS89",DATUM["D_ETRS_1989",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
  geometries.features = geometries.features.map(f => {
    return truncate(reprojectFeature(f, query.prj), {
      mutate: true, coordinates: 2
    })
  })

  // parse the individual field information
  const data = xml(query.xml)
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
  const grouped = groupBy(subplots, 'SpatialData')
  const cleanedPlots = []
  Object.keys(grouped).forEach(geometryId => {
    const fieldsWithSameId = grouped[geometryId]
    if (fieldsWithSameId.length > 1) {
      for (let i = 1; i < fieldsWithSameId.length; i++) {
        fieldsWithSameId[0].Area += fieldsWithSameId[i].Area
      }
    }
    // replace geometry id with actualy geometry
    fieldsWithSameId[0].SpatialData = geometries.features.find(f => {
      return fieldsWithSameId[0].SpatialData === f.properties.geo_id
    })
    cleanedPlots.push(fieldsWithSameId[0])
  })
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(cleanedPlots)
}
