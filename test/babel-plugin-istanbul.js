/* eslint-env mocha */

const babel = require('babel-core')
import makeVisitor from '../src'

require('chai').should()

describe('babel-plugin-istanbul', function () {
  context('Babel plugin config', function () {
    it('should instrument file if shouldSkip returns false', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-cover.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.match(/statementMap/)
    })

    it('should not instrument file if shouldSkip returns true', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-not-cover.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.not.match(/statementMap/)
    })
  })

  context('source maps', function () {
    it('should use inline source map', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/has-inline-source-map.js']
          }]
        ]
      })
      result.code.should.match(/inputSourceMap/)
    })

    it('should not use inline source map if inputSourceMap is set to false', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/has-inline-source-map.js'],
            useInlineSourceMaps: false
          }]
        ]
      })
      result.code.should.not.match(/inputSourceMap/)
    })

    it('should use provided source map', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/has-inline-source-map.js'],
            inputSourceMap: { asdfQwer: 'foo' }
          }]
        ]
      })
      result.code.should.match(/inputSourceMap:\s*{\s*asdfQwer: "foo"\s*}/)
    })
  })

  context('package.json "nyc" config', function () {
    context('process.env.NYC_CONFIG is set', function () {
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

    context('process.env.NYC_CONFIG is not set', function () {
      const OLD_NYC_CONFIG = process.env.NYC_CONFIG
      before(() => {
        delete process.env.NYC_CONFIG
      })
      after(() => {
        process.env.NYC_CONFIG = OLD_NYC_CONFIG
      })

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
  })

  // TODO: setup istanbul-lib-instrument, such that we can
  // run various babel configurations.
  context('regression tests', () => {
    // regression test for https://github.com/istanbuljs/babel-plugin-istanbul/issues/78
    it('should instrument: export const foo = () => {}', function () {
      var result = babel.transformFileSync('./fixtures/issue-78.js', {
        plugins: [
          [makeVisitor({types: babel.types}), {
            include: ['fixtures/issue-78.js']
          }]
        ]
      })
      result.code.match(/statementMap/)
    })
  })
})
