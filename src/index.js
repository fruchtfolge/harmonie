// const bb = require('bb')
// const bw = require('bw')
// const by = require('by')
// const he = require('he')
const nw = require('nw')

module.exports = (state, files) => {
  switch (state) {
    case 'nw':
      nw(files)
      break
    default:
      throw new Error(`No such state as "${state} according to ISO- in Germany."`)
  }
}
