const fs = require('fs')
const harmonie = require('../src/index')
const util = require('util')

const readFile = util.promisify(fs.readFile)
// const readDir = util.promisify('fs.readDir')

;(async () => {
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
})()
