import { xml } from '../utils/parse.js'
import { wktToGeoJSON, groupByFLIK } from '../utils/geometryHelpers.js'
import { getSafe } from '../utils/helpers.js'
import queryComplete from '../utils/queryComplete.js'
import Field from '../Field.js'

export default async function by (query) {
  const incomplete = queryComplete(query, ['xml'])
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml)
  console.log(data);
  
  let applicationYear, subplots
  // try to access the subplots from the xml
  try {
    applicationYear = data.Ergebnis?.Abfrage?.Jahr || data.AbfrageErgebnis.Abfrage.Jahr
    subplots = data.Ergebnis?.Betriebe?.Betrieb?.Feldstuecke?.Feldstueck || data.AbfrageErgebnis.Betriebe.Betrieb.Feldstuecke.Feldstueck
    // only consider plots that have a geometry attached
    subplots = subplots.filter(plot => plot.Geometrie)
  } catch (e) {
    throw new Error(e, 'Error in XML data structure. Is this file the correct file from iBALIS Bavaria?')
  }

  const plots = subplots.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['@_FID']}`,
    referenceDate: applicationYear,
    NameOfField: plot.Name || `Unbenannt ${plot.Nummer}`,
    NumberOfField: plot.Nummer,
    Area: plot.Flaeche,
    FieldBlockNumber: plot['@_FID'],
    PartOfField: '',
    SpatialData: wktToGeoJSON(plot.Geometrie),
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        // only return the first crop found in the Nutzungen property (in case
        // of multiple crops), as we don't have any spatial information
        // about where the crops are cultivated
        CropSpeciesCode: getSafe(() => plot.Nutzungen.Nutzung.Code) || getSafe(() => plot.Nutzungen.Nutzung[0].Code),
        Name: ''
      }
    }
  }))
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}
