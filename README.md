# harmonie :seedling:
*harmonie* is a software package that harmonizes farm subsidy application files of all German federal states. 
It takes the various xml, gml, shp, and dbf files issued by the federal farm subsidy application softwares, and converts them into **WGS84** projected
GeoJSON geometries suitable for any web mapping service.

With *harmonie*, you can outsource parsing of the different direct payment application files, so you can rely on a given input data structure.  

*harmonie*
- ✅ works in the browser/Node.js
- ✅ adheres to the [agroJSON](https://github.com/fruchtfolge/agroJSON) specification
- ✅ is open source (MIT license)


Converting the geometries (fields) contained in the application files is supported for **all** federal states in Germany.
For most federal states, additional information as the primary crop cultivated on a field, as well as the [fieldblock number (FLIK)](https://de.wikipedia.org/wiki/Feldblock) are obtained as well.

The following overview table displays the current state of the project:

✅ Federal states fully supported by 'harmonie': Plot geometries, including crop cultivation code and FLIK are obtained.  
☑️ Federal states partially supported by 'harmonie': Only plot geometries are obtained.

| Federal state          | ISO 3166-2 code | Subsidy application program                                                                                                              | Test data available? | Supported by 'harmonie' | ToDos                                          |
|:-----------------------|:----------------|:-----------------------------------------------------------------------------------------------------------------------------------------|:---------------------|:------------------------|:-----------------------------------------------|
| Brandenburg            | DE-BB           | [WebClient Agrarantrag BB](https://www.agrarantrag-bb.de/webClient_BB_P/)                                                                | ✅                    | ✅                       | -                                              |
| Berlin                 | DE-BE           | [WebClient Agrarantrag BB](https://www.agrarantrag-bb.de/webClient_BB_P/)                                                                | ✅                    | ✅                       | -                                              |
| Baden-Württemberg      | DE-BW           | [FIONA - Flächeninformation und Online-Antrag](https://fiona.landbw.de/fiona/pages/login.xhtml)                                          | ✅                    | ✅                       | -                                              |
| Bayern                 | DE-BY           | [iBalis Bayern](https://www.stmelf.bayern.de/ibalis/hRPSYCJ9iai73RtXboYewXCBR-_cYW-D/hRPf5)                                              | ✅                    | ✅                       | -                                              |
| Bremen                 | DE-HB           | [ANDI - Agrarförderung Niedersachsen Digital](https://sla.niedersachsen.de/andi-web/)                                                    | ⬜️                    | ☑️                       | Waiting on test data (ANDI NDS)                |
| Hessen                 | DE-HE           | [Antragsmappe der WI-Bank](https://www.wibank.de/wibank/direktzahlungen)                                                                 | ✅                    | ✅                       | -                                              |
| Hamburg                | DE-HH           | [ANDI - Agrarförderung Niedersachsen Digital](https://sla.niedersachsen.de/andi-web/)                                                    | ⬜️                    | ☑️                       | Waiting on test data (ANDI NDS)                |
| Mecklenburg-Vorpommern | DE-MV           | [WebClient Agrarantrag MV](https://online.agrarantrag-mv.de/webClient_MV_P/)                                                             | ✅                    | ✅                       | -                                              |
| Niedersachsen          | DE-NI           | [ANDI - Agrarförderung Niedersachsen Digital](https://sla.niedersachsen.de/andi-web/)                                                    | ⬜️                    | ☑️                       | Waiting on test data (ANDI NDS)                |
| Nordrhein-Westfalen    | DE-NW           | [ELAN-NRW WebClient](https://www.elan-nrw.de/webClient_NW/#docs)                                                                         | ✅                    | ✅                       | -                                              |
| Rheinland-Pfalz        | DE-RP           | [eAntrag](https://www.dlr.rlp.de/Internet/global/inetcntr.nsf/dlr_web_full.xsp?src=6F7G9TYH1A&p1=IT5HUS52Z8&p3=SXP6I7GS55&p4=JM94D5V1SK) | ✅                    | ☑️                       | Create property mapping                        |
| Schleswig-Holstein     | DE-SH           | [WebClient Agrarantrag SH](https://www.sammelantrag-sh.dataport.de/webClient_SH_P/SHWebClient.html)                                      | ⬜️                    | ☑️                       | Waiting on test data (ELSA Schleswig-Holstein) |
| Saarland               | DE-SL           | [ASdigital Saarland](https://www.saarland.de/126854.htm)                                                                                 | ✅                    | ✅                       | -                                              |
| Sachsen                | DE-SN           | [DianaWeb WebClient SN](https://www.diana.sachsen.de/webClient_SN_P/#login)                                                              | ⬜️                    | ☑️                       | Waiting on test data (DIANAweb Sachsen)        |
| Sachsen-Anhalt         | DE-ST           | [ELAISA WebClient ST](https://www.inet17.sachsen-anhalt.de/webClient_ST_P/)                                                              | ⬜️                    | ☑️                       | Waiting on test data (ELAISA Sachsen-Anhalt)   |
| Thüringen              | DE-TH           | [Verona Thüringen](https://verona.thueringen.de/#)                                                                                       | ✅                    | ✅                       | -                                              |

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
  - `projection` *\<string, UTF-8\> optional for shp and dbf request, can be specified when the input files are not EPSG:25832* 

Sample return value:
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
| Bremen                 | DE-HB           | state, shp, dbf      |
| Hessen                 | DE-HE           | state, shp, dbf      |
| Hamburg                | DE-HH           | state, shp, dbf      |
| Mecklenburg-Vorpommern | DE-MV           | state, xml           |
| Niedersachsen          | DE-NI           | state, shp, dbf      |
| Nordrhein-Westfalen    | DE-NW           | state, xml, gml      |
| Rheinland-Pfalz        | DE-RP           | state, shp, dbf      |
| Schleswig-Holstein     | DE-SH           | state, shp, dbf      |
| Saarland               | DE-SL           | state, shp, dbf      |
| Sachsen                | DE-SN           | state, shp, dbf      |
| Sachsen-Anhalt         | DE-ST           | state, shp, dbf      |
| Thüringen              | DE-TH           | state, shp, dbf      |

## Specifics for certain federal states

#### DE-HE: Hessen
According to the test data received from Hessen, the shape file and accompanying database
does not contain information about the reference date of the files. Therefore, please expect the `referenceDate` to be undefined for this federal state.

#### DE-TH: Thüringen
According to the test data received from Thüringen, the shape file and accompanying database
does not contain information about the crop cultivation for a particular field. Therefore, expect the
`Cultivation` property to be empty.

## Contribution
Contribution is highly appreciated 👍!  
Please open an issue in case of questions / bug reports or a pull request if you implemented a new feature / bug fix.  
In the latter case, please make sure to run `npm test` (and adapt `test/test.js` to your changes) and / or update the `README` 🙂

## License
MIT @Christoph Pahmeyer

This software is crafted with :heart: at the [University of Bonn - EMAS Group](https://www.ilr.uni-bonn.de/em/em_e.htm)
