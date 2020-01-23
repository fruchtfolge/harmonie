const fs = require('fs')
const harmonie = require('../src/index')
const util = require('util')

const readFile = util.promisify(fs.readFile)
// const readDir = util.promisify('fs.readDir')

;(async () => {
  const xml = await readFile('input/de-nw/NW20AGR_NTNW_009990088.xml')
  const gml = await readFile('input/de-nw/NW20AGR_NTNW_009990088.gml')
  const data = await harmonie('DE-NW', {})
})()
