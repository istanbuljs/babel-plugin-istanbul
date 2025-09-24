'use strict'

module.exports = {
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ],
  ignore: [
    '**/test/babel-8/node_modules/**'
  ],
  env: {
    test: {
      plugins: ['./lib']
    }
  }
}
