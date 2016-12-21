/* eslint-env mocha */

const babel = require('babel-core')
import mockProcess from 'pmock'
import fs from 'fs'
import makeVisitor from '../src'

require('chai').should()

describe('babel-plugin-istanbul', function () {
  it('transforms arrow functions', function () {
    var result = babel.transformFileSync('./fixtures/should-transform-arrow-function.js', {
      babelrc: false,
      plugins: [
        [makeVisitor({types: babel.types}), {
          include: ['fixtures/should-transform-arrow-function.js']
        }]
      ]
    })
    result.code.should.not.contain('() => {')
  })

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

  context('package.json "nyc" config', function () {
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

  // Regression tests for https://github.com/istanbuljs/babel-plugin-istanbul/issues/7
  if (!/^v0\.10/.test(process.version)) { // mock-fs does not work on Node 0.10.
    const mockFs = require('mock-fs')
    context('when current path uses a symlink', function () {
      beforeEach(function () {
        mockFs({
          '/project': {
            'fixtures': {
              'should-cover.js': fs.readFileSync('./fixtures/should-cover.js')
            },
            'package.json': fs.readFileSync('./package.json')
          },
          '/symlink': mockFs.symlink({path: '/project'})
        })
      })

      const shouldInstrument = file => {
        var result = babel.transformFileSync(file, {
          plugins: [
            makeVisitor({types: babel.types})
          ]
        })
        result.code.should.match(/statementMap/)
      }

      context('and NYC_CWD is set', function () {
        var env

        beforeEach(function () {
          env = mockProcess.env({
            NYC_CWD: '/symlink'
          })
        })

        it('should instrument file accessed via link', function () {
          shouldInstrument('/symlink/fixtures/should-cover.js')
        })

        it('should instrument file accessed via real path', function () {
          shouldInstrument('/project/fixtures/should-cover.js')
        })

        afterEach(function () {
          env.reset()
        })
      })

      context('and only process.cwd() is set', function () {
        var env, cwd

        beforeEach(function () {
          env = mockProcess.env({
            NYC_CWD: ''
          })
          cwd = mockProcess.cwd(fs.realpathSync('/symlink')) // realpath because of mock-fs Windows quirk re: process.cwd
        })

        it('should instrument file accessed via link', function () {
          shouldInstrument('/symlink/fixtures/should-cover.js')
        })

        it('should instrument file accessed via real path', function () {
          shouldInstrument('/project/fixtures/should-cover.js')
        })

        afterEach(function () {
          env.reset()
          cwd.reset()
        })
      })

      afterEach(function () {
        mockFs.restore()
      })
    })
  }
})
