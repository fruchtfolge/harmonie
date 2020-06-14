import parse from '../utils/parse'
import helpers from '../utils/helpers'
import queryComplete from '../utils/queryComplete'
import Field from '../Field'

export default async function bb (query) {
  const incomplete = queryComplete(query, ['xml'])
  if (incomplete) throw new Error(incomplete)
  const data = parse.xml(query.xml)
  const applicationYear = data['fa:flaechenantrag']['fa:xsd_info']['fa:xsd_jahr']
  const parzellen = data['fa:flaechenantrag']['fa:gesamtparzellen']['fa:gesamtparzelle']
  let count = 0
  const plots = parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche']
    acc.push(new Field({
      id: `harmonie_${count}_${hnf['fa:flik']}`,
      referenceDate: applicationYear,
      NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
      NumberOfField: Math.floor(hnf['fa:teilflaechennummer']),
      Area: hnf['fa:groesse'],
      FieldBlockNumber: hnf['fa:flik'],
      PartOfField: 'a',
      SpatialData: helpers.toGeoJSON(hnf['fa:geometrie']),
      LandUseRestriction: '',
      Cultivation: {
        PrimaryCrop: {
          CropSpeciesCode: hnf['fa:nutzung'],
          Name: ''
        }
      }
    }))
    count++
    // go on with field (buffer) strips
    const strfFlaechen = p['fa:teilflaechen']['fa:streifen_flaechen']
    // return only main area if no field strips are defined
    if (!strfFlaechen) return acc
    // convert to array structure if only one buffer strip is defined
    if (!Array.isArray(strfFlaechen['fa:streifen'])) {
      strfFlaechen['fa:streifen'] = [strfFlaechen['fa:streifen']]
    }
    strfFlaechen['fa:streifen'].forEach((stf, j) => {
      count++
      acc.push(new Field({
        id: `harmonie_${count}_${stf['fa:flik']}`,
        referenceDate: applicationYear,
        NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
        NumberOfField: Math.floor(stf['fa:teilflaechennummer']),
        Area: stf['fa:groesse'],
        FieldBlockNumber: stf['fa:flik'],
        PartOfField: helpers.toLetter(j + 1),
        SpatialData: helpers.toGeoJSON(stf['fa:geometrie']),
        LandUseRestriction: '',
        Cultivation: {
          PrimaryCrop: {
            CropSpeciesCode: stf['fa:nutzung'],
            Name: ''
          },
          CatchCrop: {
            CropSpeciesCode: '',
            Name: ''
          },
          PrecedingCrop: {
            CropSpeciesCode: '',
            Name: ''
          }
        }
      }))
    })
    return acc
  }, [])
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(plots)
}
