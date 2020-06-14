const fs = require('fs')
const harmonie = require('..')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
// const readDir = util.promisify('fs.readDir')

;(async () => {
  // DE-BB
  const bb = await readFile('./test/input/DE-BB/129530000041.nn.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-BB',
      xml: bb
    })
    writeFile('test/output/DE-BB.json', JSON.stringify(data), 'utf8')
  } catch (e) {
    console.log(e)
  }
/*
  // DE-BW
  const xml_BW = await readFile('./test/input/DE-BW/Flurstücksverzeichnis/FIONA-FSV-089994449000-AKTIV.xml', 'utf8')
  const shp_BW = await readFile('./test/input/DE-BW/GIS/fiona_089994449000_ETRS89.shp')
  const dbf_BW = await readFile('./test/input/DE-BW/GIS/fiona_089994449000_ETRS89.dbf')
  try {
    const data = await harmonie({
      state: 'DE-BW',
      xml: xml_BW,
      shp: shp_BW,
      dbf: dbf_BW
    })
    writeFile('test/output/DE-BW.json', JSON.stringify(data), 'utf8')
  } catch (e) {
    console.log(e)
  }
  /*
  // DE-BY
  const by = await readFile('./test/input/DE-BY/FlaechenAbfrage_535585.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-BY',
      xml: by
    })
    writeFile('test/output/DE-BY.json', JSON.stringify(data), 'utf8')
  } catch (e) {
    console.log(e)
  }

  // DE-MV
  const mv = await readFile('./test/input/DE-MV/139530620006.nn.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-MV',
      xml: mv
    })
    writeFile('test/output/DE-MV.json', JSON.stringify(data), 'utf8')
  } catch (e) {
    console.log(e)
  }

  // DE-NW
  const nw = await readFile('./test/input/DE-NW/NW20AGR_NTNW_009990088.xml', 'utf8')
  const gml = await readFile('./test/input/DE-NW/TS_009990088.gml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-NW',
      xml: nw,
      gml: gml
    })
    writeFile('test/output/DE-NW.json', JSON.stringify(data), 'utf8')
  } catch (e) {
    console.log(e)
  }
  */
})()
