import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function bw (query) {
  const incomplete = queryComplete(query, ['xml'])
  if (incomplete) throw new Error(incomplete)
  const data = parse.xml(query.xml)
  let applicationYear, subplots
  // try to access the subplots from the xml
  try {
    applicationYear = data['fsv:FSV']['fsv:FSVHeader']['commons:Antragsjahr']
    subplots = data['fsv:FSV']['fsv:FSVTable']['fsv:FSVTableRow']
    // only consider plots that have a geometry attached
    subplots = subplots.filter(plot => plot['fsvele:Geometrie'])
  } catch (e) {
    throw new Error('Error in XML data structure. Is this file the correct file from FSV BW?')
  }
  return subplots.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['fsvele:FLIK']}`,
    referenceDate: applicationYear,
    NameOfField: plot['fsvele:GewannName'] || `Unbenannt ${plot['fsvele:SchlagNummer']}`,
    NumberOfField: plot['fsvele:SchlagNummer'],
    Area: plot['fsvele:NutzflaecheMitLandschaftselement'],
    FieldBlockNumber: plot['fsvele:FLIK'],
    PartOfField: '',
    SpatialData: '', // helpers.toGeoJSON(plot['fsvele:Geometrie']),
    LandUseRestriction: '',
    Cultivation: plot['fsvele:CodeDerKultur']
  }))
}
