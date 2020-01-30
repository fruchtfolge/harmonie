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
      resolve(),
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
      'shapefile'
    ],
    output: [{
      file: pkg.main,
      format: 'cjs'
    },
    {
      file: pkg.module,
      format: 'es'
    }
    ]
  }
]
