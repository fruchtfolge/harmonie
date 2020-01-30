export default class Field {
  constructor (properties) {
    this.id = properties.id || 'String'
    this.referenceDate = properties.referenceDate
    this.NameOfField = properties.NameOfField || `Unbenannt ${properties.NumberOfField}`
    this.NumberOfField = properties.NumberOfField
    this.Area = properties.Area
    this.FieldBlockNumber = properties.FieldBlockNumber
    this.PartOfField = properties.PartOfField
    this.SpatialData = properties.SpatialData
    this.LandUseRestriction = properties.LandUseRestriction
    this.Cultivation = properties.Cultivation
  }
}
