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
    applicationYear = data.Ergebnis.Abfrage.Jahr
    subplots = data.Ergebnis.Betriebe.Betrieb.Feldstuecke.Feldstueck
    // only consider plots that have a geometry attached
    subplots = subplots.filter(plot => plot.Geometrie)
  } catch (e) {
    throw new Error(e, 'Error in XML data structure. Is this file the correct file from iBALIS Bavaria?')
  }

  return subplots.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['@_FID']}`,
    referenceDate: applicationYear,
    NameOfField: plot.Name || `Unbenannt ${plot.Nummer}`,
    NumberOfField: plot.Nummer,
    Area: plot.Flaeche,
    FieldBlockNumber: plot['@_FID'],
    PartOfField: '',
    SpatialData: helpers.wktToGeoJSON(plot.Geometrie),
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        // only return the first crop found in the Nutzungen property (in case
        // of multiple crops), as we don't have any spatial information
        // about where the crops are cultivated
        CropSpeciesCode: helpers.getSafe(() => plot.Nutzungen.Nutzung.Code) || helpers.getSafe(() => plot.Nutzungen.Nutzung[0].Code),
        Name: ''
      }
    }
  }))
}
