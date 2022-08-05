import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

export default [
  // browser-friendly (minified) UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'harmonie',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs(),
      terser()
    ]
  },
  {
    input: 'src/index.js',
    output: {
      name: 'harmonie',
      file: pkg.module,
      format: 'es'
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs(),
      terser()
    ]
  },
  // node js and module version
  {
    input: 'src/index.js',
    external: [
      '@turf/helpers',
      'elan-parser',
      'fast-xml-parser',
      'proj4',
      'shapefile',
      '@turf/meta',
      'terraformer-wkt-parser',
      'polygon-clipping'
    ],
    output: [{
      file: pkg.main,
      format: 'cjs',
      exports: "auto"
    }
    ]
  }
]
