import bb from './states/DE-BB'
import bw from './states/DE-BW'
import by from './states/DE-BY'
import he from './states/DE-HE'
import mv from './states/DE-MV'
import ni from './states/DE-NI'
import nw from './states/DE-NW'
import sl from './states/DE-SL'
import th from './states/DE-TH'
import * as shapefile from 'shapefile'

export default function harmonie (query) {
  const state = query.state
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
      return by(query)
    case 'DE-HB':
      return ni(query)
    case 'DE-HE':
      return he(query)
    case 'DE-HH':
      return ni(query)
    case 'DE-MV':
      return mv(query)
    case 'DE-NI':
      return ni(query)
    case 'DE-NW':
      return nw(query)
    case 'DE-RP':
      return ni(query)
    case 'DE-SH':
      return ni(query)
    case 'DE-SL':
      return sl(query)
    case 'DE-SN':
      return ni(query)
    case 'DE-ST':
      return ni(query)
    case 'DE-TH':
      return th(query)
    default:
      throw new Error(`No such state as "${state}" according to ISO 3166-2 in Germany."`)
  }
}

export async function properties (dbf) {
  const dbfSource = await shapefile.openDbf(dbf)
  const properties = await dbfSource.read();
  await dbfSource.cancel();
  return Object.keys(properties.value)
}

export { shapefile }
