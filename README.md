# harmonie :seedling:
*harmonie* is a software package that harmonizes IACS (ZID) files of all German federal states. With *harmonie*, you can outsource parsing of the different direct payment application files, so you can rely on a given input data structure.  

*harmonie*
- ✅ works in the browser/Node.js
- ✅ adheres to the [agroJSON](https://github.com/fruchtfolge/agroJSON) specification
- ✅ is open source (MIT license)

This repository is **WIP**, APIs and data structures are likely to change.  
Currently, **8/16** federal states are supported.  
The following overview table displays the current state of the project:

| Federal state          | ISO 3166-2 code | Test data available? | Supported by 'harmonie' | ToDos                                          |
|:-----------------------|:----------------|:---------------------|:------------------------|:-----------------------------------------------|
| Brandenburg            | DE-BB           | ✅                    | ✅                       | -                                              |
| Berlin                 | DE-BE           | ✅                    | ✅                       | -                                              |
| Baden-Württemberg      | DE-BW           | ✅                    | ✅                       | -                                              |
| Bayern                 | DE-BY           | ✅                    | ✅                       | -                                              |
| Bremen                 | DE-HB           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Hessen                 | DE-HE           | ✅                    | ✅                       | -                                              |
| Hamburg                | DE-HH           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Mecklenburg-Vorpommern | DE-MV           | ✅                    | ✅                       | -                                              |
| Niedersachsen          | DE-NI           | ⬜️                    | ⬜️                       | Waiting on test data (ANDI NDS)                |
| Nordrhein-Westfalen    | DE-NW           | ✅                    | ✅                       | -                                              |
| Rheinland-Pfalz        | DE-RP           | ✅                    | ⬜️                       | Create property mapping                        |
| Schleswig-Holstein     | DE-SH           | ⬜️                    | ⬜️                       | Waiting on test data (ELSA Schleswig-Holstein) |
| Saarland               | DE-SL           | ✅                    | ✅                       | -                                              |
| Sachsen                | DE-SN           | ⬜️                    | ⬜️                       | Waiting on test data (DIANAweb Sachsen-Anhalt) |
| Sachsen-Anhalt         | DE-ST           | ⬜️                    | ⬜️                       | Waiting on test data (ELAISA Sachsen)          |
| Thüringen              | DE-TH           | ✅                    | ⬜️                       | Create property mapping                        |

## Installation

### Browser
```html
<script src='https://raw.githubusercontent.com/fruchtfolge/harmonie/master/dist/harmonie.min.js'></script>
```
Or grab a release from the [relases tab](https://github.com/fruchtfolge/harmonie/releases).
Loading the minified file via script tag exposes the global function `harmonie`.

**Internet Explorer compatibility:** Note that this package makes use of modern [ES6 language features](http://es6-features.org/#StringInterpolation) which are **not compatible** with Internet Explorer (also not by polyfilling). In order to support Internet Explorer directly, you may transpile the code (e.g. using [@babel](https://github.com/babel/babel)). Alternatively, you may use the plugin on the server side, or use our (upcoming) API.


### Node.js / build tools
```
npm install zid-harmonie
```

The module exports a single function. 
```js
const harmonie = require('zid-harmonie')
// or using ES6 import
import harmonie from 'zid-harmonie'
```

## Usage
The function takes a single argument (*object*), returning a *Promise*. 
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
  NumberOfField: 0,
  Area: 1.1,
  FieldBlockNumber: 'DENW...',
  PartOfField: 0,
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

The following table displays the required properties for a query depending on
the federal state:

| Federal state          | ISO 3166-2 code | Required query data  |
|:-----------------------|:----------------|:---------------------|
| Brandenburg            | DE-BB           | state, xml           |
| Berlin                 | DE-BE           | state, xml           |
| Baden-Württemberg      | DE-BW           | state, xml, shp, dbf |
| Bayern                 | DE-BY           | state, xml           |
| Bremen                 | DE-HB           | state, -             |
| Hessen                 | DE-HE           | state, shp, dbf      |
| Hamburg                | DE-HH           | state, -             |
| Mecklenburg-Vorpommern | DE-MV           | state, xml           |
| Niedersachsen          | DE-NI           | state, -             |
| Nordrhein-Westfalen    | DE-NW           | state, xml, gml      |
| Rheinland-Pfalz        | DE-RP           | state, -             |
| Schleswig-Holstein     | DE-SH           | state, -             |
| Saarland               | DE-SL           | state, shp, dbf      |
| Sachsen                | DE-SN           | state, -             |
| Sachsen-Anhalt         | DE-ST           | state, -             |
| Thüringen              | DE-TH           | state, -             |

## Contribution
Contribution is highly appreciated 👍!  
Please open an issue in case of questions / bug reports or a pull request if you implemented a new feature / bug fix.  
In the latter case, please make sure to run `npm test` (and adapt `test/test.js` to your changes) and / or update the `README` 🙂

## License
MIT @Christoph Pahmeyer

This software is crafted with :heart: at the [University of Bonn - EMAS Group](https://www.ilr.uni-bonn.de/em/em_e.htm)
