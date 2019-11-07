/* eslint-env mocha */

import * as babel from '@babel/core'
import makeVisitor from '../src'
import path from 'path'

require('chai').should()

describe('babel-plugin-istanbul', function () {
  context('Babel plugin config', function () {
    it('should instrument file if shouldSkip returns false', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.match(/statementMap/)
    })

    it('should not instrument file if shouldSkip returns true', function () {
      var result = babel.transformFileSync('./fixtures/plugin-should-not-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/plugin-should-cover.js']
          }]
        ]
      })
      result.code.should.not.match(/statementMap/)
    })

    context('local node_modules', function () {
      it('should instrument file if shouldSkip returns false', function () {
        var result = babel.transformFileSync('./fixtures/node_modules/should-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            [makeVisitor, {
              excludeNodeModules: false,
              exclude: ['node_modules/**'],
              include: ['fixtures/node_modules/should-cover.js']
            }]
          ]
        })
        result.code.should.match(/statementMap/)
      })

      it('should not instrument file if shouldSkip returns true', function () {
        var result = babel.transformFileSync('./fixtures/node_modules/should-not-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            [makeVisitor, {
              include: ['fixtures/node_modules/should-not-cover.js']
            }]
          ]
        })
        result.code.should.not.match(/statementMap/)
      })
    })

    it('should call onCover callback', function () {
      var args
      babel.transformFileSync('./fixtures/plugin-should-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
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
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/has-inline-source-map.js']
          }]
        ]
      })
      result.code.should.match(/inputSourceMap/)
    })

    it('should not use inline source map if inputSourceMap is set to false', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/has-inline-source-map.js'],
            useInlineSourceMaps: false
          }]
        ]
      })
      result.code.should.not.match(/inputSourceMap/)
    })

    it('should use provided source map', function () {
      var result = babel.transformFileSync('./fixtures/has-inline-source-map.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/has-inline-source-map.js'],
            inputSourceMap: { asdfQwer: 'foo' }
          }]
        ]
      })
      result.code.should.match(/inputSourceMap:\s*{\s*asdfQwer: "foo"\s*}/)
    })
  })

  context('instrument options', function () {
    it('should honor coverageVariable option', function () {
      const result = babel.transformFileSync('./fixtures/should-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/should-cover.js'],
            coverageVariable: '__TEST_VARIABLE__'
          }]
        ]
      })
      result.code.should.match(/__TEST_VARIABLE__/)
      result.code.should.not.match(/__coverage__/)
    })

    it('should honor coverageGlobalScope option', function () {
      const result = babel.transformFileSync('./fixtures/should-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/should-cover.js'],
            coverageGlobalScope: 'window'
          }]
        ]
      })
      result.code.should.match(/new Function\("return window"\)/)
      result.code.should.not.match(/new Function\("return this"\)/)
    })

    it('should honor coverageGlobalScope option', function () {
      const result = babel.transformFileSync('./fixtures/should-cover.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/should-cover.js'],
            coverageGlobalScopeFunc: false
          }]
        ]
      })
      result.code.should.match(/global\s*=\s*this/)
      result.code.should.not.match(/global\s*=\s*new Function\("return this"\)/)
    })

    it('should honor ignoreClassMethods option', function () {
      const result = babel.transformFileSync('./fixtures/class-functions.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/class-functions.js'],
            ignoreClassMethods: ['bar']
          }]
        ]
      })

      // bar() is ignored
      result.code.should.match(/bar\(\)\s*{\s*}/)
      result.code.should.not.match(/bar\(\)\s*{\s*cov_.*/)

      // barz() does not get instrumented
      result.code.should.match(/barz\(\)\s*{\s*cov_.*/)
      result.code.should.not.match(/barz\(\)\s*{\s*}/)
    })
  })

  context('package.json "nyc" config', function () {
    context('process.env.NYC_CONFIG is set', function () {
      it('should instrument file if shouldSkip returns false', function () {
        var result = babel.transformFileSync('./fixtures/should-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            makeVisitor
          ]
        })
        result.code.should.match(/statementMap/)
      })

      it('should not instrument file if shouldSkip returns true', function () {
        var result = babel.transformFileSync('./fixtures/should-not-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            makeVisitor
          ]
        })
        result.code.should.not.match(/statementMap/)
      })
    })

    context('process.env.NYC_CONFIG is not set', function () {
      this.timeout(10000)

      const OLD_NYC_CONFIG = process.env.NYC_CONFIG
      const OLD_NYC_CWD = process.env.NYC_CWD
      before(() => {
        delete process.env.NYC_CONFIG
        delete process.env.NYC_CWD
      })
      after(() => {
        process.env.NYC_CONFIG = OLD_NYC_CONFIG
        process.env.NYC_CWD = OLD_NYC_CWD
      })

      it('should instrument file if shouldSkip returns false', function () {
        var result = babel.transformFileSync('./fixtures/should-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            makeVisitor
          ]
        })
        result.code.should.match(/statementMap/)
      })

      it('should not instrument file if shouldSkip returns true', function () {
        var result = babel.transformFileSync('./fixtures/should-not-cover.js', {
          babelrc: false,
          configFile: false,
          plugins: [
            makeVisitor
          ]
        })
        result.code.should.not.match(/statementMap/)
      })

      it('should load config using cwd', function () {
        const cwd = path.resolve(__dirname, '..', 'fixtures', 'config')
        function helper (file, match, opts) {
          const result = babel.transformFileSync(
            path.resolve(cwd, file),
            {
              babelrc: false,
              configFile: false,
              plugins: [
                [makeVisitor, { cwd, ...opts }]
              ]
            }
          )
          if (match) {
            result.code.should.match(/statementMap/)
          } else {
            result.code.should.not.match(/statementMap/)
          }
        }

        helper('file1.js', true)
        helper('file2.js', false)
        helper('file1.js', false, { nycrcPath: 'nyc-alt.config.js' })
        helper('file2.js', true, { nycrcPath: 'nyc-alt.config.js' })
        ;(function () {
          babel.transformFileSync(
            path.resolve(cwd, 'file1.js'),
            {
              babelrc: false,
              configFile: false,
              plugins: [
                [makeVisitor, { cwd, nycrcPath: 'missing-config.js' }]
              ]
            }
          )
        }).should.throw(/Requested configuration file missing-config.js not found/)
      })
    })
  })

  // TODO: setup istanbul-lib-instrument, such that we can
  // run various babel configurations.
  context('regression tests', () => {
    // regression test for https://github.com/istanbuljs/babel-plugin-istanbul/issues/78
    it('should instrument: export const foo = () => {}', function () {
      var result = babel.transformFileSync('./fixtures/issue-78.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/issue-78.js']
          }]
        ]
      })
      result.code.match(/statementMap/)
    })

    // regression test for https://github.com/istanbuljs/babel-plugin-istanbul/issues/201
    it('should not conflict with transform-modules-commonjs', function () {
      var result = babel.transformFileSync('./fixtures/issue-201.js', {
        babelrc: false,
        configFile: false,
        plugins: [
          [makeVisitor, {
            include: ['fixtures/issue-201.js']
          }],
          '@babel/plugin-transform-modules-commonjs'
        ]
      })
      result.code.should.match(/_path.*\.resolve\)\(_path\)/)
      result.code.should.not.match(/_path\.resolve\)\(_path\)/)
    })
  })
})
