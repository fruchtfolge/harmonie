const test = require('./helpers')

module.exports = {
  bb (updateResults) {
    return test({
      state: 'DE-BB',
      xml: './test/input/DE-BB/129530000041.nn.xml',
      testResultsFile: './test/output/DE-BB.json'
    }, updateResults)
  },
  bw (updateResults) {
    return test({
      state: 'DE-BW',
      xml: './test/input/DE-BW/Flurstücksverzeichnis/FIONA-FSV-089994449000-AKTIV.xml',
      shp: './test/input/DE-BW/GIS/fiona_089994449000_ETRS89.shp',
      dbf: './test/input/DE-BW/GIS/fiona_089994449000_ETRS89.dbf',
      testResultsFile: 'test/output/DE-BW.json'
    }, updateResults)
  },
  by (updateResults) {
    return test({
      state: 'DE-BY',
      xml: './test/input/DE-BY/FlaechenAbfrage_535585.xml',
      testResultsFile: 'test/output/DE-BY.json'
    }, updateResults)
  },
  he (updateResults) {
    return test({
      state: 'DE-HE',
      shp: './test/input/DE-HE/SCHLAG.shp',
      dbf: './test/input/DE-HE/SCHLAG.dbf',
      testResultsFile: 'test/output/DE-HE.json'
    }, updateResults)
  },
  mv (updateResults) {
    return test({
      state: 'DE-MV',
      xml: './test/input/DE-MV/139530620006.nn.xml',
      testResultsFile: 'test/output/DE-MV.json'
    }, updateResults)
  },
  nw (updateResults) {
    return test({
      state: 'DE-NW',
      xml: './test/input/DE-NW/NW20AGR_NTNW_009990088.xml',
      gml: './test/input/DE-NW/TS_009990088.gml',
      testResultsFile: 'test/output/DE-NW.json'
    }, updateResults)
  },
  sl (updateResults) {
    return test({
      state: 'DE-SL',
      shp: './test/input/DE-SL/schlag_pi5120.shp',
      dbf: './test/input/DE-SL/schlag_pi5120.dbf',
      testResultsFile: 'test/output/DE-SL.json'
    }, updateResults)
  }
}
