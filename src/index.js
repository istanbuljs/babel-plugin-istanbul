import {realpathSync} from 'fs'
import {dirname} from 'path'
import {programVisitor} from 'istanbul-lib-instrument'
import assign from 'object-assign'

const testExclude = require('test-exclude')
const findUp = require('find-up')

function getRealpath (n) {
  try {
    return realpathSync(n) || n
  } catch (e) {
    return n
  }
}

function makeShouldSkip () {
  let exclude
  return function shouldSkip (file, opts) {
    if (!exclude) {
      const cwd = getRealpath(process.env.NYC_CWD || process.cwd())
      exclude = testExclude(assign(
        { cwd },
        Object.keys(opts).length > 0 ? opts : {
          configKey: 'nyc',
          configPath: dirname(findUp.sync('package.json', { cwd }))
        }
      ))
    }

    return !exclude.shouldInstrument(file)
  }
}

function makeVisitor ({types: t}) {
  const shouldSkip = makeShouldSkip()
  return {
    visitor: {
      Program: {
        enter (path) {
          this.__dv__ = null
          const realPath = getRealpath(this.file.opts.filename)
          if (shouldSkip(realPath, this.opts)) {
            return
          }
          let { inputSourceMap } = this.opts
          if (this.opts.useInlineSourceMaps !== false) {
            inputSourceMap = inputSourceMap || this.file.opts.inputSourceMap
          }
          this.__dv__ = programVisitor(t, realPath, {
            coverageVariable: '__coverage__',
            inputSourceMap
          })
          this.__dv__.enter(path)
        },
        exit (path) {
          if (!this.__dv__) {
            return
          }
          let result = this.__dv__.exit(path)
          if (this.opts.onCover) {
            this.opts.onCover(getRealpath(this.file.opts.filename), result.fileCoverage)
          }
        }
      }
    }
  }
}

export default makeVisitor
