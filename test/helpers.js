const fs = require('fs')
const { deepStrictEqual } = require('assert')
const util = require('util')
const harmonie = require('..').default

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

async function updateTestResult (path, data) {
  await writeFile(path, JSON.stringify(data), 'utf8')
}

async function compare (expectedFile, actual) {
  const expected = await readFile(expectedFile, 'utf8')
  deepStrictEqual(JSON.parse(expected), JSON.parse(JSON.stringify(actual)))
}

async function test (options, updateResults) {
  try {
    // read input data from test directory
    if (options.xml) options.xml = await readFile(options.xml, 'utf8')
    if (options.gml) options.gml = await readFile(options.gml, 'utf8')
    if (options.shp) options.shp = await readFile(options.shp)
    if (options.dbf) options.dbf = await readFile(options.dbf)
    if (options.prj) options.prj = await readFile(options.prj, 'utf8')

    const data = await harmonie(options)

    if (updateResults) {
      await updateTestResult(options.testResultsFile, data)
    } else {
      await compare(options.testResultsFile, data)
    }
  } catch (e) {
    throw new Error(`Error in ${options.state}: ${e}`)
  }
}

module.exports = test
