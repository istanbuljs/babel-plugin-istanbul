'use strict'

module.exports = {
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ],
  env: {
    test: {
      plugins: ['./lib']
    }
  }
}
