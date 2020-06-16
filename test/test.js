const states = require('./states')

;(async () => {
  const tests = [
    // states.bb(),
    // states.bw(),
    // states.by(),
    states.mv(true)
  ]

  try {
    await Promise.all(tests)
    console.log('Passed all tests.')
  } catch (e) {
    console.log('Error:')
    console.log(e)
  }
/*
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
