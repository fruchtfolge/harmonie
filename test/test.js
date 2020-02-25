const fs = require('fs')
const harmonie = require('..')
const util = require('util')

const readFile = util.promisify(fs.readFile)
// const readDir = util.promisify('fs.readDir')

;(async () => {
  /*
  // DE-BB
  const xml = await readFile('./test/input/DE-BB/129530000041.nn.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-BB',
      xml: xml
    })
    console.log(data)
  } catch (e) {
    console.log(e)
  }

  // DE-BW
  const xml = await readFile('./test/input/DE-BW/FIONA-FSV-089994449001-AKTIV.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-BW',
      xml: xml
    })
    console.log(data)
  } catch (e) {
    console.log(e)
  }
  */
  // DE-BY
  const xml = await readFile('./test/input/DE-BY/FlaechenAbfrage_535585.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-BY',
      xml: xml
    })
    console.log(data)
  } catch (e) {
    console.log(e)
  }

  /*
  // DE-MV
  const xml = await readFile('./test/input/DE-MV/139530620006.nn.xml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-MV',
      xml: xml
    })
    console.log(data)
  } catch (e) {
    console.log(e)
  }

  // DE-NW
  const xml = await readFile('./test/input/DE-NW/NW20AGR_NTNW_009990088.xml', 'utf8')
  const gml = await readFile('./test/input/DE-NW/TS_009990088.gml', 'utf8')
  try {
    const data = await harmonie({
      state: 'DE-NW',
      xml: xml,
      gml: gml
    })
    console.log(data)
  } catch (e) {
    console.log(e)
  }
  */
})()
