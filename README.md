# harmonie
Harmonizes IACS (ZID) files of all German Federal States

This repository is WIP, APIs and data structures are likely to change 


## Usage (current proposal)
The module exports one method. 
```js
const harmonie = require('harmonie')
```

The method takes a single argument (*object*), returning a *Promise*
```js
const data = harmonie({
  state: 'DE-NW', // Required. The federal state (ISO 3166-2 code) that issued the ZID files
  xml: '<?xml version="1.0" encoding="UTF-8"?><nn>...</nn>', // The input data. Please see table below for required input data files for each federal state, and the required encoding.
  gml: '<?xml version="1.0" encoding="UTF-8"?><wfs>...</wfs>'  
}).then(data => {
  console.log(data)
  // data is an array of field objects
}).catch(error => {
  // handle errors
})
```

## API

### `harmonie(query)`

Returns an array of objects containing individual parts of fields (German: *Teilschläge*). Properties adhere to the naming conventions defined by [agroJSON](https://github.com/fruchtfolge/agroJSON)

- `query` *\<object\>, required*
  -  `state` *\<string, ISO 3166-2\>, required*
  -  `xml` *\<string\>*
  -  `gml` *\<string\>*
  -  `shp` *\<string\>*
  -  `dbf` *\<string\>*
  -  `ETRS89` *\<boolean\>* Use ETRS89 projection instead of WGS84 **Default:** `false`

Sample return value:
```js
[{
  id: 'String',
  referenceDate: 2020,
  NameOfField: 'String',
  NumberOfField: 1,
  Area: 1.1,
  FieldBlockNumber: 1,
  PartOfField: 'a',
  SpatialData: {
    // a GeoJSON polygon or Feature Collection
  },
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
}]
```
