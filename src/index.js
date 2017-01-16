import {realpathSync} from 'fs'
import {dirname} from 'path'
import {programVisitor} from 'istanbul-lib-instrument'

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
      const nycConfig = process.env.NYC_CONFIG ? JSON.parse(process.env.NYC_CONFIG) : {}

      let config = {}
      if (Object.keys(opts).length > 0) {
        // explicitly configuring options in babel
        // takes precendence.
        config = opts
      } else if (nycConfig.include || nycConfig.exclude) {
        // nyc was configured in a parent process (keep these settings).
        config = {
          include: nycConfig.include,
          exclude: nycConfig.exclude
        }
      } else {
        // fallback to loading config from key in package.json.
        config = {
          configKey: 'nyc',
          configPath: dirname(findUp.sync('package.json', { cwd }))
        }
      }

      exclude = testExclude(Object.assign(
        { cwd },
        config
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
          this.__dv__.exit(path)
        }
      }
    }
  }
}

export default makeVisitor
