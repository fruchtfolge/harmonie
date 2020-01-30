function _interopDefault$1 (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fastXmlParser = require('fast-xml-parser');
var shapefile = require('shapefile');
var elanParser = require('elan-parser');
var helpers$1 = require('@turf/helpers');
var proj4 = _interopDefault$1(require('proj4'));

var parse = {
  async shape (shp, dbf) {
    return shapefile.read(shp, dbf)
  },
  xml (xml) {
    return fastXmlParser.parse(xml, null, true)
  },
  dataExperts (xml, gml) {
    return elanParser.join(elanParser.parseXML(xml), elanParser.parseGML(gml))
  }
};

// configure proj4 in order to convert GIS coordinates to web mercator
proj4.defs('EPSG:25832', '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs');
const fromETRS89 = new proj4.Proj('EPSG:25832');
const toWGS84 = new proj4.Proj('WGS84');

var helpers = {
  toLetter (number) {
    if (!isNaN(number) && number >= 0 && number <= 26) {
      const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
      return alphabet[number]
    }
    return 'a'
  },
  toGeoJSON (gml) {
    // convert gml to json
    const json = parse.xml(gml.replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const flatJson = this.flatten(json);
    const polygonArray = Object.keys(flatJson).map(k => {
      return this.toCoordinates(flatJson[k])
    });
    return helpers$1.multiPolygon(polygonArray)
  },
  toPairs (array) {
    return array.reduce((result, value, index, array) => {
      if (index % 2 === 0) { result.push(array.slice(index, index + 2)); }
      return result
    }, [])
  },
  toCoordinates (string, keepProjection) {
    const numbers = string.split(/\s+/g).map(s => Number(s));
    let coords = this.toPairs(numbers);
    if (!keepProjection) {
      coords = coords.map(latlng => {
        return proj4(fromETRS89, toWGS84, latlng)
      });
    }
    return coords
  },
  flatten (ob) {
    var toReturn = {};
    for (var i in ob) {
      if (!(i in ob)) continue
      if ((typeof ob[i]) === 'object') {
        var flatObject = this.flatten(ob[i]);
        for (var x in flatObject) {
          if (!(x in flatObject)) continue
          toReturn[i + '.' + x] = flatObject[x];
        }
      } else {
        toReturn[i] = ob[i];
      }
    }
    return toReturn
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
  return parzellen.reduce((acc, p) => {
    // start off with main area of field
    const hnf = p['fa:teilflaechen']['fa:hauptnutzungsflaeche'];
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
      }));
    });
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

async function nw (query) {
  const incomplete = queryComplete(query, ['xml', 'gml']);
  if (incomplete) throw new Error(incomplete)
  const data = parse.dataExperts(query.xml, query.gml);

  return data.map((f, i) => new Field({
    id: `harmonie_${i}_${f.feldblock}`,
    referenceDate: f.applicationYear,
    NameOfField: f.schlag.bezeichnung,
    NumberOfField: f.schlag.nummer,
    Area: f.nettoflaeche,
    FieldBlockNumber: f.feldblock,
    PartOfField: f.teilschlag,
    SpatialData: f.geometry,
    LandUseRestriction: '',
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
  }))
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
    case 'DE-MV':
      return bb(query)
    case 'DE-NW':
      return nw(query)
    default:
      throw new Error(`No such state as "${state
      }" according to ISO 3166-2 in Germany."`)
  }
}

module.exports = harmonie;
