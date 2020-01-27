# harmonie :seedling:
*harmonie* is a software package that harmonizes IACS (ZID) files of all German federal states. With *harmonie*, you can outsource parsing of the different direct payment application files, so you can rely on a given input data structure.  

*harmonie*
- ✅ works in the browser/Node.js
- ✅ adheres to the [agroJSON](https://github.com/fruchtfolge/agroJSON) specification
- ✅ is open source (MIT license)

This repository is **WIP**, APIs and data structures are likely to change.  
Currently, **4/16** federal states are supported.  
The following overview table displays the current state of the project:

| Federal state          | ISO 3166-2 code | Test data available? | Supported by 'harmonie' | ToDos                                          |
|:-----------------------|:----------------|:---------------------|:------------------------|:-----------------------------------------------|
| Brandenburg            | DE-BB           | ✅                    | ✅                       | -                                              |
| Berlin                 | DE-BE           | ✅                    | ✅                       | -                                              |
| Baden-Württemberg      | DE-BW           | ✅                    | ⬜️                       | Create property mapping                        |
| Bayern                 | DE-BY           | ✅                    | ⬜️                       | Create property mapping                        |
| Bremen                 | DE-HB           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Hessen                 | DE-HE           | ✅                    | ⬜️                       | Create property mapping                        |
| Hamburg                | DE-HH           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Mecklenburg-Vorpommern | DE-MV           | ✅                    | ✅                       | -                                              |
| Niedersachsen          | DE-NI           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Nordrhein-Westfalen    | DE-NW           | ✅                    | ✅                       | -                                              |
| Rheinland-Pfalz        | DE-RP           | ✅                    | ⬜️                       | Create property mapping                        |
| Schleswig-Holstein     | DE-SH           | ⬜️                    | ⬜️                       | Waiting on test data (ELSA Schleswig-Holstein) |
| Saarland               | DE-SL           | ✅                    | ⬜️                       | Create property mapping                        |
| Sachsen                | DE-SN           | ⬜️                    | ⬜️                       | Waiting on test data (DIANAweb Sachsen-Anhalt) |
| Sachsen-Anhalt         | DE-ST           | ⬜️                    | ⬜️                       | Waiting on test data (ELAISA Sachsen)          |
| Thüringen              | DE-TH           | ✅                    | ⬜️                       | Create property mapping                        |

## Installation
The package is not published (yet).
In order to install, clone or fork this repository.

## Usage
The module exports one method. 
```js
const harmonie = require('harmonie')
```

The method takes a single argument (*object*), returning a *Promise*
```js
const data = harmonie({
  state: 'DE-NW', // Required. The federal state (ISO 3166-2 code) that issued the ZID/IACS files
  xml: '<?xml version="1.0" encoding="UTF-8"?><nn>...</nn>', // The input data. Please see table below for required input data files for each federal state, and the required encoding.
  gml: '<?xml version="1.0" encoding="UTF-8"?><wfs>...</wfs>'  
}).then(data => {
  console.log(data)
  // data is an array of "part of field" (DE: 'Teilschläge') objects
}).catch(error => {
  // handle errors
})
```

## API

### `harmonie(query)`

Returns an array of objects containing individual parts of fields (German: *Teilschläge*). Properties adhere to the naming conventions defined by [agroJSON](https://github.com/fruchtfolge/agroJSON)

- `query` *\<object\>, required*
  -  `state` *\<string, ISO 3166-2\> required*
  -  `xml` *\<string, UTF-8\> may be required, depending on state*
  -  `gml` *\<string, UTF-8\>*
  -  `shp` *\<blob\>*
  -  `dbf` *\<blob\>*

Sample minimum return value:
```js
[{
  id: 'harmonie_runningIndex_FieldBlockNumber', // e.g. 'harmonie_36_DEBBLI0261009129'
  referenceDate: 2020,
  NameOfField: 'Hinterm Hof',
  NumberOfField: 1,
  Area: 1.1,
  FieldBlockNumber: 'DENW...',
  PartOfField: 'a',
  SpatialData: {
    // a GeoJSON feature
  },
  Cultivation: {
    PrimaryCrop: {
      CropSpeciesCode: 415,
      Name: 'Wiesen'
    }
  }
}]
```

## Contribution
Contribution is highly appreciated 👍!  
Please open an issue in case of questions / bug reports or a pull request if you implemented a new feature / bug fix.  
In the latter case, please make sure to run `npm test` (and adapt `test/test.js` to your changes) and / or update the `README` 🙂

## License
MIT

This software is crafted with :heart: at the [University of Bonn - EMAS Group](https://www.ilr.uni-bonn.de/em/em_e.htm)
