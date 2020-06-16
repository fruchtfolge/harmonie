import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml'])
  if (incomplete) throw new Error(incomplete)
  const data = parse.dataExperts(query.xml, query.gml)

  const plots = data.map((f, i) => new Field({
    id: `harmonie_${i}_${f.feldblock}`,
    referenceDate: f.applicationYear,
    NameOfField: f.schlag.bezeichnung,
    NumberOfField: f.schlag.nummer,
    Area: f.nettoflaeche,
    FieldBlockNumber: f.feldblock,
    PartOfField: f.teilschlag,
    SpatialData: f.geometry,
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: f.nutzungaj.code,
        Name: f.nutzungaj.bezeichnung
      },
      CatchCrop: {
        CropSpeciesCode: f.greeningcode === '1' ? 50 : '',
        Name: f.greeningcode === '1' ? 'Mischkulturen Saatgutmischung' : ''
      },
      PrecedingCrop: {
        CropSpeciesCode: f.nutzungvj.code,
        Name: f.nutzungvj.bezeichnung
      }
    }
  }))
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(plots)
}
