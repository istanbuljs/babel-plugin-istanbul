/* global describe, it */

const babel = require('babel-core')
import makeVisitor from '../src'

require('chai').should()

describe('babel-plugin-istanbul', function () {
  it('should instrument file if shouldSkip returns false', function () {
    var result = babel.transformFileSync('./fixtures/should-cover.js', {
      plugins: [
        makeVisitor({types: babel.types})
      ]
    })
    result.code.should.match(/statementMap/)
  })

  it('should not instrument file if shouldSkip returns true', function () {
    var result = babel.transformFileSync('./fixtures/should-not-cover.js', {
      plugins: [
        makeVisitor({types: babel.types})
      ]
    })
    result.code.should.not.match(/statementMap/)
  })
})
