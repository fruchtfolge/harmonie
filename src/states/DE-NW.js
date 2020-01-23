const parse = require('../utils/parse')
const queryComplete = require('../utils/queryComplete')

module.exports = async (query) => {
  const incomplete = queryComplete(query, ['xml', 'gml'])
  if (incomplete) throw new Error(incomplete)
  const data = parse.dataExperts(query.xml, query.gml)
  return data
}

/*
{
  id: 'String',
  referenceDate: 2020,
  NameOfField: 'String',
  NumberOfField: 1,
  Area: 1.1,
  FieldBlockNumber: 1,
  PartOfField: 'a',
  SpatialData: {},
  LandUseRestriction: [{
    TypeOfRestriction: 'String',
    StartDate: '2020-01-23T13:11:07.774Z',
    EndDate: '2020-01-23T13:11:07.774Z'
  }],
  Cultivation: {
    PrimaryCrop: {
      CropSpeciesCode: 1,
      Name: 'String'
    },
    CatchCrop: {
      CropSpeciesCode: 1,
      Name: 'String'
    },
    PrecedingCrop: {
      CropSpeciesCode: 1,
      Name: 'String'
    }
  }
}
*/
