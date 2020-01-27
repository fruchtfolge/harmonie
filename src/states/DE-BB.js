const parse = require('../utils/parse')
const queryComplete = require('../utils/queryComplete')
const Field = require('../Field')

module.exports = async (query) => {
  const incomplete = queryComplete(query, ['shp', 'dbf'])
  if (incomplete) throw new Error(incomplete)
  const data = await parse.shape(query.shp, query.dbf)
  // for now, we are only interested in main crops and fiel strips,
  // landscape elements and conservation areas are left out for now
  const filtered = data.features.filter(f => f.properties.ART === 'HNF' ||
  f.properties.ART === 'STR')

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
}
