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
  return parzellen.reduce((acc, p) => {
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
  // const geom = helpers.toGeoJSON(parzellen[0]['fa:teilflaechen']['fa:hauptnutzungsflaeche']['fa:geometrie'])
  // return geom['gml:Surface']['gml:patches']['gml:PolygonPatch']
  // for now, we are only interested in main crops and fiel strips,
  // landscape elements and conservation areas are left out for now
  // const filtered = data.features.filter(f => f.properties.ART === 'HNF' ||
  // f.properties.ART === 'STR')

  /*
  return filtered.map((f, i) => new Field({
    id: `harmonie_${i}_${f.properties.CONSTANT + f.properties.FLIK_FLEK}`,
    referenceDate: '', // seems to be only stored in the xml file
    NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
    NumberOfField: f.properties.NUMMER.split('.')[0],
    Area: f.properties.FLAECHE * 10000,
    FieldBlockNumber: f.feldblock,
    PartOfField: Number(f.properties.NUMMER.split('.')[1]),
    SpatialData: f.geometry,
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: f.properties.CODE,
        Name: f.properties.CODE_BEZ
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
  */
}
