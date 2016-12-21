import {realpathSync} from 'fs'
import {dirname} from 'path'
import {programVisitor} from 'istanbul-lib-instrument'
import assign from 'object-assign'
import transformArrowFunctions from 'babel-plugin-transform-es2015-arrow-functions'

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

function makeVisitor (props) {
  const shouldSkip = makeShouldSkip()
  const { visitor: { ArrowFunctionExpression } } = transformArrowFunctions(props)
  return {
    visitor: {
      ArrowFunctionExpression,
      Program: {
        enter (path) {
          this.__dv__ = null
          const realPath = getRealpath(this.file.opts.filename)
          if (shouldSkip(realPath, this.opts)) {
            return
          }
          this.__dv__ = programVisitor(props.types, realPath)
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
