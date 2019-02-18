/* eslint-env mocha */

import * as babel from '@babel/core'
import makeVisitor from '../src'
import path from 'path'

require('chai').should()

describe('babel-plugin-istanbul', function () {
  context('Babel plugin config', function () {
    it('should instrument file if shouldSkip returns false', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-cover.js', {
        plugins: [
          [makeVisitor({ types: babel.types }), {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.match(/statementMap/)
    })

    it('should not instrument file if shouldSkip returns true', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-not-cover.js', {
        plugins: [
          [makeVisitor({ types: babel.types }), {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.not.match(/statementMap/)
    })

    it('should call onCover callback', function () {
      var args
      babel.transformFileSync('./fixtures/plugin-should-cover.js', {
        plugins: [
          [makeVisitor({ types: babel.types }), {
            onCover: function () {
              args = [].slice.call(arguments)
            },
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      args[0].should.equal(path.resolve('./fixtures/plugin-should-cover.js'))
      args[1].statementMap.should.exist // eslint-disable-line
    })
  })

  context('source maps', function () {
    it('should use inline source map', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        plugins: [
          [makeVisitor({ types: babel.types }), {
            include: ['fixtures/has-inline-source-map.js']
          }]
        ]
      })
      result.code.should.match(/inputSourceMap/)
    })

    it('should not use inline source map if inputSourceMap is set to false', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        plugins: [
          [makeVisitor({ types: babel.types }), {
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
          [makeVisitor({ types: babel.types }), {
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
            makeVisitor({ types: babel.types })
          ]
        })
        result.code.should.match(/statementMap/)
      })

      it('should not instrument file if shouldSkip returns true', function () {
        var result = babel.transformFileSync('./fixtures/should-not-cover.js', {
          plugins: [
            makeVisitor({ types: babel.types })
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
            makeVisitor({ types: babel.types })
          ]
        })
        result.code.should.match(/statementMap/)
      })

      it('should not instrument file if shouldSkip returns true', function () {
        var result = babel.transformFileSync('./fixtures/should-not-cover.js', {
          plugins: [
            makeVisitor({ types: babel.types })
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
          [makeVisitor({ types: babel.types }), {
            include: ['fixtures/issue-78.js']
          }]
        ]
      })
      result.code.match(/statementMap/)
    })

    it('should respect a changed cwd in options', function () {
      const opts = {
        cwd: path.resolve(__dirname, '..', 'lib')
      }
      const plugins = [
        [makeVisitor, opts]
      ]

      var resultBefore = babel.transformFileSync('./fixtures/should-respect-cwd.js', {
        plugins
      })

      resultBefore.code.should.not.match(/statementMap/)

      opts.cwd = path.resolve(__dirname, '..', 'fixtures')

      var resultAfter = babel.transformFileSync('./fixtures/should-respect-cwd.js', {
        plugins
      })
      resultAfter.code.should.match(/statementMap/)
    })
  })

  describe('should leave scope with correct references', function () {
    it('leaves scope references as Identifiers', function () {
      // This is a unit test which inspects the root cause of the problem:
      // scope references that are replaced to no longer be Identifiers
      babel.transformFileSync('./fixtures/with-changed-scope.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor({ types: babel.types }), {
            include: ['fixtures/with-changed-scope.js']
          }],
          function testScope (t) {
            return {
              visitor: {
                ImportSpecifier (path) {
                  const fileScope = path.hub.file.scope
                  const localBinding = fileScope.getBinding(path.node.local.name)
                  for (const localReference of localBinding.referencePaths) {
                    localReference.type.should.equal('Identifier')
                  }
                }
              }
            }
          }
        ]
      })
    })

    it('creates valid syntax with other transforming plugins', function () {
      // This is a minimal end-to-end test which illustrates how scope
      // reference alteration impacts the assumptions of other plugins
      const result = babel.transformFileSync(
        './fixtures/with-changed-scope.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            [makeVisitor({ types: babel.types }), {
              include: ['fixtures/with-changed-scope.js']
            }],
            'babel-plugin-lodash'
          ]
        })

      function testSyntaxError () {
        babel.parse(result.code)
      }

      testSyntaxError.should.not.throw()
    })
  })
})
