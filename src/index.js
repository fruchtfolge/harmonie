// const bb = require('bb')
// const bw = require('bw')
// const by = require('by')
// const he = require('he')
const nw = require('./states/DE-NW')

module.exports = (query) => {
  const state = query.state
  if (!state) {
    throw new Error('No property "state" given, required to be in ' +
     'ISO 3166-2 UTF-8 string format (e.g. "DE-NW")')
  }
  switch (state) {
    case 'DE-NW':
      return nw(query)
    default:
      throw new Error(`No such state as "${state}" according to ISO 3166-2 in Germany."`)
  }
}
