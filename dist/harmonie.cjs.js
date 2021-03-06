'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fastXmlParser = require('fast-xml-parser');
var shapefile = require('shapefile');
var elanParser = require('elan-parser');
var helpers$1 = require('@turf/helpers');
var meta = require('@turf/meta');
var proj4 = _interopDefault(require('proj4'));
var polygonClipping = _interopDefault(require('polygon-clipping'));
var terraformerWktParser = require('terraformer-wkt-parser');

var parse = {
  async shape (shp, dbf) {
    return shapefile.read(shp, dbf)
  },
  xml (xml) {
    return fastXmlParser.parse(xml, { ignoreAttributes: false }, true)
  },
  dataExperts (xml, gml) {
    return elanParser.join(elanParser.parseXML(xml), elanParser.parseGML(gml))
  }
};

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
// DE-MV
proj4.defs('EPSG:5650', '+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9996 +x_0=33500000 +y_0=0 +ellps=GRS80 +units=m +no_defs');
// DE-HE
proj4.defs('EPSG:31467', '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// DE-SL
proj4.defs('EPSG:31462', '+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
// others
proj4.defs('EPSG:31468', '+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs');
proj4.defs('EPSG:25833', '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG:4647', '+proj=tmerc +lat_0=0 +lon_0=9 +k=0.9996 +x_0=32500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

const fromETRS89 = new proj4.Proj('EPSG:25832');
const toWGS84 = new proj4.Proj('WGS84');

// ToDo: Fix lexical binding of this
function getArrayDepth (value) {
  return Array.isArray(value)
    ? 1 + Math.max(...value.map(getArrayDepth))
    : 0
}

var helpers = {
  toLetter (number) {
    if (!isNaN(number) && number >= 0 && number <= 26) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
      return alphabet[number]
    }
    return 'a'
  },
  toGeoJSON (gml, projection) {
    // convert gml to json
    const json = parse.xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const flatJson = this.flatten(json);
    const polygonArray = Object.keys(flatJson).map(k => {
      return this.toCoordinates(flatJson[k], projection)
    }).filter(c => c[0]);
    if (getArrayDepth(polygonArray) === 4) {
      return helpers$1.multiPolygon(polygonArray)
    }
    return helpers$1.polygon(polygonArray)
  },
  toPairs (array) {
    return array.reduce((result, value, index, array) => {
      if (index % 2 === 0) { result.push(array.slice(index, index + 2)); }
      return result
    }, [])
  },
  toWGS84 (coordPair, projection) {
    if (coordPair.length !== 2) return
    if (!projection) projection = fromETRS89;
    return proj4(projection, toWGS84, coordPair)
  },
  toCoordinates (string, projection, keepProjection) {
    const numbers = string.split(/\s+/g).map(s => Number(s)).filter(n => !isNaN(n));
    let coords = this.toPairs(numbers);
    if (!keepProjection) {
      coords = coords.map(c => this.toWGS84(c, projection));
    }
    return coords
  },
  flatten (ob) {
    const toReturn = {};
    for (const i in ob) {
      if (!(i in ob)) continue
      if ((typeof ob[i]) === 'object') {
        const flatObject = this.flatten(ob[i]);
        for (const x in flatObject) {
          if (!(x in flatObject)) continue
          toReturn[i + '.' + x] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn
  },
  wktToGeoJSON (wkt) {
    let geojson = terraformerWktParser.parse(wkt);
    geojson = this.reprojectFeature(geojson);
    return geojson
  },
  reprojectFeature (feature, projection) {
    if (!projection) projection = fromETRS89;
    meta.coordEach(feature, coord => {
      const p = proj4(projection, toWGS84, coord);
      coord.length = 0;
      coord.push(...p);
    });
    return feature
  },
  getSafe (value, defVal) {
    try {
      return value()
    } catch (e) {
      return defVal
    }
  },
  groupByFLIK (fields) {
    // create an object where each fieldblock the farm operates on is a key
    // with the fields in that fieldblock being the properties
    const groups = this.groupBy(fields, 'FieldBlockNumber');
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
        const union = polygonClipping.union(...fieldsInFieldBlock.map(f => f.SpatialData.geometry.coordinates));
        // the features do not form a single union, we therefore assume they
        // cannot be joined to single field

        if (this.getSafe(() => union.geometry.length) > 1) {
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
  },
  groupBy (xs, key) {
    return xs.reduce((rv, x) => {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv
    }, {})
  }
};

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
    this.SpatialData = properties.SpatialData;
    this.LandUseRestriction = properties.LandUseRestriction;
    this.Cultivation = properties.Cultivation;
  }
}

async function bb (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = parse.xml(query.xml);
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
      SpatialData: helpers.toGeoJSON(hnf['fa:geometrie'], 'EPSG:25833'),
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
        SpatialData: helpers.toGeoJSON(stf['fa:geometrie'], 'EPSG:25833'),
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
  return helpers.groupByFLIK(plots)
}

async function bw (query) {
  const incomplete = queryComplete(query, ['xml', 'shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'GEOGCS["ETRS89",DATUM["D_ETRS_1989",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj));

  // parse the individual field information
  const data = parse.xml(query.xml);
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
  const grouped = helpers.groupBy(subplots, 'SpatialData');
  const cleanedPlots = [];
  Object.keys(grouped).forEach(geometryId => {
    const fieldsWithSameId = grouped[geometryId];
    if (fieldsWithSameId.length > 1) {
      for (var i = 1; i < fieldsWithSameId.length; i++) {
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
  return helpers.groupByFLIK(cleanedPlots)
}

async function bw$1 (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = parse.xml(query.xml);
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
    SpatialData: helpers.wktToGeoJSON(plot.Geometrie),
    LandUseRestriction: '',
    Cultivation: {
      PrimaryCrop: {
        // only return the first crop found in the Nutzungen property (in case
        // of multiple crops), as we don't have any spatial information
        // about where the crops are cultivated
        CropSpeciesCode: helpers.getSafe(() => plot.Nutzungen.Nutzung.Code) || helpers.getSafe(() => plot.Nutzungen.Nutzung[0].Code),
        Name: ''
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(plots)
}

async function he (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  if (!query.prj) {
    query.prj = 'EPSG:31467';
  }
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj));

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
  return helpers.groupByFLIK(subplots)
}

async function bb$1 (query) {
  const incomplete = queryComplete(query, ['xml']);
  if (incomplete) throw new Error(incomplete)
  const data = parse.xml(query.xml);
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
      SpatialData: helpers.toGeoJSON(hnf['fa:geometrie'], 'EPSG:5650'),
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
        SpatialData: helpers.toGeoJSON(stf['fa:geometrie']),
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
  return helpers.groupByFLIK(plots)
}

async function sl (query) {
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
  const geometries = await parse.shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj));

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
  return helpers.groupByFLIK(subplots)
}

async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml']);
  if (incomplete) throw new Error(incomplete)
  const data = parse.dataExperts(query.xml, query.gml);

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
        CropSpeciesCode: f.greeningcode === '1' ? 50 : '',
        Name: f.greeningcode === '1' ? 'Mischkulturen Saatgutmischung' : ''
      },
      PrecedingCrop: {
        CropSpeciesCode: f.nutzungvj.code,
        Name: f.nutzungvj.bezeichnung
      }
    }
  }));
  // finally, group the parts of fields by their FLIK and check whether they are
  // actually seperate parts of fields
  return helpers.groupByFLIK(plots)
}

async function sl$1 (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  query.prj = query.prj || 'EPSG:31462';
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj));

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
  return helpers.groupByFLIK(subplots)
}

async function sl$2 (query) {
  const incomplete = queryComplete(query, ['shp', 'dbf']);
  if (incomplete) throw new Error(incomplete)
  // parse the shape file information
  const geometries = await parse.shape(query.shp, query.dbf);
  // reproject coordinates into web mercator
  geometries.features = geometries.features.map(f => helpers.reprojectFeature(f, query.prj));

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
  return helpers.groupByFLIK(subplots)
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
      return bw$1(query)
    case 'DE-HB':
      return sl(query)
    case 'DE-HE':
      return he(query)
    case 'DE-HH':
      return sl(query)
    case 'DE-MV':
      return bb$1(query)
    case 'DE-NI':
      return sl(query)
    case 'DE-NW':
      return nw(query)
    case 'DE-RP':
      return sl(query)
    case 'DE-SH':
      return sl(query)
    case 'DE-SL':
      return sl$1(query)
    case 'DE-SN':
      return sl(query)
    case 'DE-ST':
      return sl(query)
    case 'DE-TH':
      return sl$2(query)
    default:
      throw new Error(`No such state as "${state}" according to ISO 3166-2 in Germany."`)
  }
}

module.exports = harmonie;
