'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fastXmlParser = require('fast-xml-parser');
var shapefile = require('shapefile');
var proj4 = require('proj4');
var helpers = require('@turf/helpers');
var meta = require('@turf/meta');
var polygonClipping = require('polygon-clipping');
var wkt = require('@terraformer/wkt');
var truncate = require('@turf/truncate');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var shapefile__namespace = /*#__PURE__*/_interopNamespace(shapefile);
var proj4__default = /*#__PURE__*/_interopDefaultLegacy(proj4);
var polygonClipping__default = /*#__PURE__*/_interopDefaultLegacy(polygonClipping);
var truncate__default = /*#__PURE__*/_interopDefaultLegacy(truncate);

function getSafe (value, defVal) {
  try {
    return value()
  } catch (e) {
    return defVal
  }
}

// configure proj4 in order to convert GIS coordinates to web mercator
proj4__default["default"].defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
const fromETRS89$1 = new proj4__default["default"].Proj('EPSG:25832');
const toWGS84$1 = new proj4__default["default"].Proj('WGS84');

const alwaysParseAsArrays = [
  'nn.land.parzelle',
  'wfs:FeatureCollection.gml:featureMember'
];
const options = {
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  parseAttributeValue: true,
  isArray: (name, jpath) => {
    if (alwaysParseAsArrays.indexOf(jpath) !== -1) return true
  }
};

function parseXML (xml) {
  if (fastXmlParser.XMLValidator.validate(xml) !== true) throw new Error('Invalid XML structure.')
  const parser = new fastXmlParser.XMLParser(options);
  const json = parser.parse(xml);

  const basis = {
    applicationYear: getSafe(() => json.nn.antragsjahr),
    farmId: getSafe(() => json.nn.bnrzd),
    state: getSafe(() => json.nn.land.bezeichnung),
    fieldBlockConstant: getSafe(() => json.nn.land.feldblockkonstante),
    stateNo: getSafe(() => json.nn.land.nummer)
  };

  if (getSafe(() => json.nn.land.parzelle)) {
    return json.nn.land.parzelle.map(field => {
      return {
        ...basis,
        ...field
      }
    })
  } else {
    return new Error('No fields found in XML.')
  }
}

function parseGML (gml) {
  if (fastXmlParser.XMLValidator.validate(gml) !== true) {
    throw new Error('Invalid GML structure.')
  }
  const parser = new fastXmlParser.XMLParser(options);
  const json = parser.parse(gml);
  if (getSafe(() => json['wfs:FeatureCollection']['gml:featureMember'])) {
    const results = [];
    json['wfs:FeatureCollection']['gml:featureMember'].forEach(field => {
      const id = getSafe(() => field['elan:tschlag']['elan:SCHLAGNR']);
      const year = getSafe(() => field['elan:tschlag']['elan:WIRTSCHAFTSJAHR']);
      let coordinates = getSafe(() => field['elan:tschlag']['elan:GEO_COORD_']['gml:Polygon']['gml:outerBoundaryIs']['gml:LinearRing']['gml:coordinates']);

      if (!coordinates) return

      // split coordinate string into array of strings
      coordinates = coordinates.split(' ');
      // then into array of arrays and transform string values to numbers
      coordinates = coordinates.map(pair => {
        return pair.split(',').map(coord => {
          return Number(coord)
        })
      });

      coordinates = coordinates.map(latlng => {
        return proj4__default["default"](fromETRS89$1, toWGS84$1, latlng)
      });
      const feature = helpers.polygon([coordinates], {
        number: id,
        year
      });

      return results.push({
        schlag: {
          nummer: id
        },
        geometry: feature
      })
    });

    return results
  } else {
    throw new Error('No fields found in GML.')
  }
}

function join (xml, gml) {
  return xml.map(field => {
    const geometry = gml.find(
      // eslint-disable-next-line eqeqeq
      tschlag => tschlag.schlag.nummer == field.schlag.nummer
    );
    if (!geometry) return field
    return {
      ...geometry,
      ...field
    }
  })
}

function shape (shp, dbf) {
  return shapefile.read(shp, dbf)
}

function xml (xml) {
  const parser = new fastXmlParser.XMLParser({ ignoreAttributes: false }, true);
  return parser.parse(xml, true)
}

function dataExperts (xml, gml) {
  return join(parseXML(xml), parseGML(gml))
}

// configure proj4 in order to convert GIS coordinates to web mercator
proj4__default["default"].defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
// DE-MV
proj4__default["default"].defs('EPSG:5650', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=33500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
// DE-HE
proj4__default["default"].defs('EPSG:31467', '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// DE-SL
proj4__default["default"].defs('EPSG:31462', '+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// others
proj4__default["default"].defs('EPSG:31468', '+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
proj4__default["default"].defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs');
proj4__default["default"].defs('EPSG:4647', '+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=32500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const fromETRS89 = new proj4__default["default"].Proj('EPSG:25832');
const toWGS84 = new proj4__default["default"].Proj('WGS84');

// ToDo: Fix lexical binding of this
function getArrayDepth (value) {
  return Array.isArray(value)
    ? 1 + Math.max(...value.map(getArrayDepth))
    : 0
}

function toGeoJSON (gml, projection) {
  // convert gml to json
  const json = xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  const flatJson = flatten(json);
  const polygonArray = Object.keys(flatJson).map(k => {
    return toCoordinates(flatJson[k], projection)
  }).filter(c => c[0]);
  if (getArrayDepth(polygonArray) === 4) {
    return helpers.multiPolygon(polygonArray)
  }
  return helpers.polygon(polygonArray)
}

function toPairs (array) {
  return array.reduce((result, value, index, array) => {
    if (index % 2 === 0) { result.push(array.slice(index, index + 2)); }
    return result
  }, [])
}

function coordsToWGS84 (coordPair, projection) {
  if (coordPair.length !== 2) return
  if (!projection) projection = fromETRS89;
  return proj4__default["default"](projection, toWGS84, coordPair)
}

function toCoordinates (string, projection, keepProjection) {
  const numbers = string.split(/\s+/g).map(s => Number(s)).filter(n => !isNaN(n));
  let coords = toPairs(numbers);
  if (!keepProjection) {
    coords = coords.map(c => coordsToWGS84(c, projection));
  }
  return coords
}

function flatten (ob) {
  const toReturn = {};
  for (const i in ob) {
    if (!(i in ob)) continue
    if ((typeof ob[i]) === 'object') {
      const flatObject = flatten(ob[i]);
      for (const x in flatObject) {
        if (!(x in flatObject)) continue
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn
}

function wktToGeoJSON (wkt$1) {
  let geojson = wkt.wktToGeoJSON(wkt$1);
  geojson = reprojectFeature(geojson);
  return geojson
}

function reprojectFeature (feature, projection) {
  if (!projection) projection = fromETRS89;
  meta.coordEach(feature, coord => {
    const p = proj4__default["default"](projection, toWGS84, coord);
    coord.length = 0;
    coord.push(...p);
  });
  return feature
}

function groupByFLIK (fields) {
  // create an object where each fieldblock the farm operates on is a key
  // with the fields in that fieldblock being the properties
  const groups = groupBy(fields, 'FieldBlockNumber');
  let curNo = 0;
  const reNumberedFields = [];
  Object.keys(groups).forEach(fieldBlock => {
    // if there's only one field in the fieldblock, we just re-assign its field
    // number and go on
    const fieldsInFieldBlock = groups[fieldBlock];
    if (fieldsInFieldBlock.length === 1) {
      fieldsInFieldBlock[0].NumberOfField = curNo;
      fieldsInFieldBlock[0].PartOfField = 0;
      reNumberedFields.push(fieldsInFieldBlock[0]);
      curNo++;
    } else {
      // unfortunately, we cannot be sure if the two fields from a fieldblock
      // are acutally part of a single field, as it may happen that a farmer has
      // two fields in the same fieldblock, while another farmer owns the field
      // in between these other fields.
      // we therefore need to check if the fields would form a union or not
      const union = polygonClipping__default["default"].union(...fieldsInFieldBlock.map(f => f.SpatialData.geometry.coordinates));
      // the features do not form a single union, we therefore assume they
      // cannot be joined to single field

      if (getSafe(() => union.geometry.length) > 1) {
        fieldsInFieldBlock.forEach(field => {
          field.NumberOfField = curNo;
          field.PartOfField = 0;
          reNumberedFields.push(field);
          curNo++;
        });
      } else {
        fieldsInFieldBlock.forEach((field, i) => {
          field.NumberOfField = curNo;
          field.PartOfField = i;
          reNumberedFields.push(field);
        });
        curNo++;
      }
    }
  });
  return reNumberedFields
}

function groupBy (xs, key) {
  return xs.reduce((rv, x) => {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv
  }, {})
}

function queryComplete (query, requiredProps) {
  return requiredProps.reduce((incomplete, curProp) => {
    if (curProp in query) return ''
    return incomplete + `Missing property ${curProp} for state ${query.state}. `
  }, '')
}

class Field {
  constructor (properties) {
    this.id = properties.id || 'String';
    this.referenceDate = properties.referenceDate;
    this.NameOfField = properties.NameOfField || `Unbenannt ${properties.NumberOfField}`;
    this.NumberOfField = properties.NumberOfField;
    this.Area = properties.Area;
    this.FieldBlockNumber = properties.FieldBlockNumber;
    this.PartOfField = properties.PartOfField;

    try {
      this.SpatialData = truncate__default["default"](properties.SpatialData, {
        mutate: true, coordinates: 2
      });
    } catch (e) {
      // in BW geometry ids are replaced with actual geometries later
      this.SpatialData = properties.SpatialData;
    }

    this.LandUseRestriction = properties.LandUseRestriction;
    this.Cultivation = properties.Cultivation;
  }
}

async function bb (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  const applicationYear = data['fa:flaechenantrag']['fa:xsd_info']['fa:xsd_jahr'];
  const parzellen = data['fa:flaechenantrag']['fa:gesamtparzellen']['fa:gesamtparzelle'];
  let count = 0;
  const plots = parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche'];
    acc.push(new Field({
      id: `harmonie_${count}_${hnf['fa:flik']}`,
      referenceDate: applicationYear,
      NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
      NumberOfField: Math.floor(hnf['fa:teilflaechennummer']),
      Area: hnf['fa:groesse'] / 10000,
      FieldBlockNumber: hnf['fa:flik'],
      PartOfField: 0,
      SpatialData: toGeoJSON(hnf['fa:geometrie'], 'EPSG:25833'),
      LandUseRestriction: '',
      Cultivation: {
        PrimaryCrop: {
          CropSpeciesCode: hnf['fa:nutzung'],
          Name: ''
        }
      }
    }));
    count++;
    // go on with field (buffer) strips
    const strfFlaechen = p['fa:teilflaechen']['fa:streifen_flaechen'];
    // return only main area if no field strips are defined
    if (!strfFlaechen) return acc
    // convert to array structure if only one buffer strip is defined
    if (!Array.isArray(strfFlaechen['fa:streifen'])) {
      strfFlaechen['fa:streifen'] = [strfFlaechen['fa:streifen']];
    }
    strfFlaechen['fa:streifen'].forEach((stf, j) => {
      count++;
      acc.push(new Field({
        id: `harmonie_${count}_${stf['fa:flik']}`,
        referenceDate: applicationYear,
        NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
        NumberOfField: Math.floor(stf['fa:teilflaechennummer']),
        Area: stf['fa:groesse'] / 10000,
        FieldBlockNumber: stf['fa:flik'],
        PartOfField: j,
        SpatialData: toGeoJSON(stf['fa:geometrie'], 'EPSG:25833'),
        LandUseRestriction: '',
        Cultivation: {
          PrimaryCrop: {
            CropSpeciesCode: stf['fa:nutzung'],
            Name: ''
          }
        }
      }));
    });
    return acc
  }, []);
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function bw (query) {
  const incomplete = queryComplete(query, ['xml', 'shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'GEOGCS["ETRS89",DATUM["D_ETRS_1989",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';
  geometries.features = geometries.features.map(f => {
    return truncate__default["default"](reprojectFeature(f, query.prj), {
      mutate: true, coordinates: 2
    })
  });

  // parse the individual field information
  const data = xml(query.xml);
  let applicationYear, subplotsRawData;
  // try to access the subplots from the xml
  try {
    applicationYear = data['fsv:FSV']['fsv:FSVHeader']['commons:Antragsjahr'];
    subplotsRawData = data['fsv:FSV']['fsv:FSVTable']['fsv:FSVTableRow'];
    // only consider plots that have a geometry attached
    subplotsRawData = subplotsRawData.filter(plot => plot['fsvele:Geometrie']);
  } catch (e) {
    throw new Error('Error in XML data structure. Is this file the correct file from FSV BW?')
  }
  const subplots = subplotsRawData.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['fsvele:FLIK']}`,
    referenceDate: applicationYear,
    NameOfField: plot['commons:Bezeichnung'],
    NumberOfField: plot['fsvele:SchlagNummer'],
    Area: plot['fsvele:NutzflaecheMitLandschaftselement']['#text'],
    FieldBlockNumber: plot['fsvele:FLIK'],
    PartOfField: '',
    SpatialData: plot['fsvele:GeometrieId'],
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot['fsvele:CodeDerKultur'],
        Name: ''
      }
    }
  }));
  // in BW some fields are having multiple entries in the raw XML, despite only
  // having a single geometry attached
  // we now group the fields by similar geometries and re-evaluate
  const grouped = groupBy(subplots, 'SpatialData');
  const cleanedPlots = [];
  Object.keys(grouped).forEach(geometryId => {
    const fieldsWithSameId = grouped[geometryId];
    if (fieldsWithSameId.length > 1) {
      for (let i = 1; i < fieldsWithSameId.length; i++) {
        fieldsWithSameId[0].Area += fieldsWithSameId[i].Area;
      }
    }
    // replace geometry id with actualy geometry
    fieldsWithSameId[0].SpatialData = geometries.features.find(f => {
      return fieldsWithSameId[0].SpatialData === f.properties.geo_id
    });
    cleanedPlots.push(fieldsWithSameId[0]);
  });
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(cleanedPlots)
}

async function by (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  console.log(data);
  
  let applicationYear, subplots;
  // try to access the subplots from the xml
  try {
    applicationYear = data.Ergebnis.Abfrage.Jahr;
    subplots = data.Ergebnis.Betriebe.Betrieb.Feldstuecke.Feldstueck;
    // only consider plots that have a geometry attached
    subplots = subplots.filter(plot => plot.Geometrie);
  } catch (e) {
    throw new Error(e, 'Error in XML data structure. Is this file the correct file from iBALIS Bavaria?')
  }

  const plots = subplots.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot['@_FID']}`,
    referenceDate: applicationYear,
    NameOfField: plot.Name || `Unbenannt ${plot.Nummer}`,
    NumberOfField: plot.Nummer,
    Area: plot.Flaeche,
    FieldBlockNumber: plot['@_FID'],
    PartOfField: '',
    SpatialData: wktToGeoJSON(plot.Geometrie),
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        // only return the first crop found in the Nutzungen property (in case
        // of multiple crops), as we don't have any spatial information
        // about where the crops are cultivated
        CropSpeciesCode: getSafe(() => plot.Nutzungen.Nutzung.Code) || getSafe(() => plot.Nutzungen.Nutzung[0].Code),
        Name: ''
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function he (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  if (!query.prj) {
    query.prj = 'EPSG:31467';
  }
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: undefined, // duh!
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.BEANTR_GRO,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.NUTZUNG
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function mv (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = xml(query.xml);
  const applicationYear = data['fa:flaechenantrag']['fa:xsd_info']['fa:xsd_jahr'];
  const parzellen = data['fa:flaechenantrag']['fa:gesamtparzellen']['fa:gesamtparzelle'];
  let count = 0;
  const plots = parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche'];
    acc.push(new Field({
      id: `harmonie_${count}_${hnf['fa:flik']}`,
      referenceDate: applicationYear,
      NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
      NumberOfField: Math.floor(hnf['fa:teilflaechennummer']),
      Area: hnf['fa:groesse'] / 10000,
      FieldBlockNumber: hnf['fa:flik'],
      PartOfField: 0,
      SpatialData: toGeoJSON(hnf['fa:geometrie'], 'EPSG:5650'),
      LandUseRestriction: '',
      Cultivation: {
        PrimaryCrop: {
          CropSpeciesCode: hnf['fa:nutzung'],
          Name: ''
        }
      }
    }));
    count++;
    // go on with field (buffer) strips
    const strfFlaechen = p['fa:teilflaechen']['fa:streifen_flaechen'];
    // return only main area if no field strips are defined
    if (!strfFlaechen) return acc
    // convert to array structure if only one buffer strip is defined
    if (!Array.isArray(strfFlaechen['fa:streifen'])) {
      strfFlaechen['fa:streifen'] = [strfFlaechen['fa:streifen']];
    }
    strfFlaechen['fa:streifen'].forEach((stf, j) => {
      count++;
      acc.push(new Field({
        id: `harmonie_${count}_${stf['fa:flik']}`,
        referenceDate: applicationYear,
        NameOfField: '', // seems to be unavailable in Agrarantrag-BB export files?,
        NumberOfField: Math.floor(stf['fa:teilflaechennummer']),
        Area: stf['fa:groesse'] / 10000,
        FieldBlockNumber: stf['fa:flik'],
        PartOfField: j,
        SpatialData: toGeoJSON(stf['fa:geometrie']),
        LandUseRestriction: '',
        Cultivation: {
          PrimaryCrop: {
            CropSpeciesCode: stf['fa:nutzung'],
            Name: ''
          }
        }
      }));
    });
    return acc
  }, []);
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function ni (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // if a projection was passed, check if it is supported
  const supportedProjs = ['EPSG:25832', 'EPSG:5650', 'EPSG:31467', 'EPSG:31462', 'EPSG:31468', 'EPSG:25833', 'EPSG:4647'];
  if (query.projection && !query.prj) {
    if (supportedProjs.indexOf(query.projection) === -1) {
      throw new Error(`Projection ${query.projection} is not supported by harmonie. The supported projections are: ${supportedProjs}`)
    }
    query.prj = query.projection;
  }
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  // as we don't know anything about the structure of the shape files,
  // we just make some assumptions based on the following information
  //
  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.ANTJAHR,
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.AKT_FL,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.KC_GEM,
        Name: undefined
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml']);
  if (incomplete) throw new Error(incomplete)
  const data = dataExperts(query.xml, query.gml);

  const plots = data.map((f, i) => new Field({
    id: `harmonie_${i}_${f.feldblock}`,
    referenceDate: f.applicationYear,
    NameOfField: f.schlag.bezeichnung,
    NumberOfField: f.schlag.nummer,
    Area: f.nettoflaeche / 10000,
    FieldBlockNumber: f.feldblock,
    PartOfField: f.teilschlag,
    SpatialData: f.geometry,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: f.nutzungaj.code,
        Name: f.nutzungaj.bezeichnung
      },
      CatchCrop: {
        // eslint-disable-next-line eqeqeq
        CropSpeciesCode: f.greeningcode == '1' ? 50 : '',
        // eslint-disable-next-line eqeqeq
        Name: f.greeningcode == '1' ? 'Mischkulturen Saatgutmischung' : ''
      },
      PrecedingCrop: {
        CropSpeciesCode: f.nutzungvj.code,
        Name: f.nutzungvj.bezeichnung
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(plots)
}

async function sl (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'EPSG:31462';
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FLIK}`,
    referenceDate: plot.properties.JAHR,
    NameOfField: plot.properties.LAGE_BEZ,
    NumberOfField: count,
    Area: plot.properties.GR,
    FieldBlockNumber: plot.properties.FLIK,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: plot.properties.NCODE,
        Name: plot.properties.CODE_BEZ
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

async function th (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => reprojectFeature(f, query.prj));

  const subplots = geometries.features.map((plot, count) => new Field({
    id: `harmonie_${count}_${plot.properties.FBI}`,
    referenceDate: undefined, // duh!
    NameOfField: '',
    NumberOfField: count,
    Area: plot.properties.FL,
    FieldBlockNumber: plot.properties.FBI,
    PartOfField: '',
    SpatialData: plot,
    Cultivation: {
      PrimaryCrop: {
        CropSpeciesCode: undefined, // duh!
        Name: undefined
      }
    }
  }));

  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return groupByFLIK(subplots)
}

function harmonie (query) {
  const state = query.state;
  if (!state) {
    throw new Error('No property "state" given, required to be in ' +
     'ISO 3166-2 UTF-8 string format (e.g. "DE-NW")')
  }
  switch (state) {
    case 'DE-BB':
      return bb(query)
    case 'DE-BE':
      return bb(query)
    case 'DE-BW':
      return bw(query)
    case 'DE-BY':
      return by(query)
    case 'DE-HB':
      return ni(query)
    case 'DE-HE':
      return he(query)
    case 'DE-HH':
      return ni(query)
    case 'DE-MV':
      return mv(query)
    case 'DE-NI':
      return ni(query)
    case 'DE-NW':
      return nw(query)
    case 'DE-RP':
      return ni(query)
    case 'DE-SH':
      return ni(query)
    case 'DE-SL':
      return sl(query)
    case 'DE-SN':
      return ni(query)
    case 'DE-ST':
      return ni(query)
    case 'DE-TH':
      return th(query)
    default:
      throw new Error(`No such state as "${state}" according to ISO 3166-2 in Germany."`)
  }
}

async function properties (dbf) {
  const dbfSource = await shapefile__namespace.openDbf(dbf);
  const properties = await dbfSource.read();
  await dbfSource.cancel();
  return Object.keys(properties.value)
}

exports.shapefile = shapefile__namespace;
exports["default"] = harmonie;
exports.properties = properties;
