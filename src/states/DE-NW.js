import { dataExperts } from '../utils/parse.js'
import { groupByFLIK } from '../utils/geometryHelpers.js'
import queryComplete from '../utils/queryComplete.js'
import Field from '../Field.js'

export default async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml'])
  if (incomplete) throw new Error(incomplete)
  const data = dataExperts(query.xml, query.gml)

  const plots = data.map((f, i) => new Field({
    id: `harmonie_${i}_${f.feldblock}`,
    referenceDate: f.applicationYear,
    NameOfField: f.schlag.bezeichnung,
    NumberOfField: f.schlag.nummer,
    Area: f.nettoflaeche / 10000,
    FieldBlockNumber: f.feldblock,
    PartOfField: f.teilschlag,
    SpatialData: f.geometry,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: f.nutzungaj.code,
        Name: f.nutzungaj.bezeichnung
      },
      CatchCrop: {
        // eslint-disable-next-line eqeqeq
        CropSpeciesCode: f.greeningcode == '1' ? 50 : '',
        // eslint-disable-next-line eqeqeq
        Name: f.greeningcode == '1' ? 'Mischkulturen Saatgutmischung' : ''
      },
      PrecedingCrop: {
        CropSpeciesCode: f.nutzungvj.code,
        Name: f.nutzungvj.bezeichnung
      }
    }
  }))
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}
