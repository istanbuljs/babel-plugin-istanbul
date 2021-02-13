import { realpathSync } from 'fs'
import { declare } from '@babel/helper-plugin-utils'
import programVisitor from './visitor.js'
import TestExclude from 'test-exclude'
import schema from '@istanbuljs/schema'

export { default as readCoverage } from './read-coverage.js'

function getRealpath (n) {
  try {
    return realpathSync(n) || /* istanbul ignore next */ n
  } catch {
    /* istanbul ignore next */
    return n
  }
}

function findConfig (opts) {
  const cwd = getRealpath(opts.cwd || process.env.NYC_CWD || /* istanbul ignore next */ process.cwd())
  const keys = Object.keys(opts)
  if (keys.length > 0) {
    // explicitly configuring options in babel
    // takes precedence.
    return {
      ...schema.defaults.babelPluginIstanbul,
      cwd,
      ...opts
    }
  }

  if (process.env.NYC_CONFIG) {
    // defaults were already applied by nyc
    return JSON.parse(process.env.NYC_CONFIG)
  }

  return {
    ...schema.defaults.babelPluginIstanbul,
    cwd
  }
}

function makeShouldSkip () {
  let exclude

  return function shouldSkip (file, nycConfig) {
    if (!exclude || (exclude.cwd !== nycConfig.cwd)) {
      exclude = new TestExclude({
        cwd: nycConfig.cwd,
        include: nycConfig.include,
        exclude: nycConfig.exclude,
        extension: nycConfig.extension,
        // Make sure this is true unless explicitly set to `false`. `undefined` is still `true`.
        excludeNodeModules: nycConfig.excludeNodeModules !== false
      })
    }

    return !exclude.shouldInstrument(file)
  }
}

export default declare(api => {
  api.assertVersion('^7')

  const shouldSkip = makeShouldSkip()

  return {
    visitor: {
      Program: {
        enter (path) {
          this.__dv__ = null
          this.nycConfig = findConfig(this.opts)
          const realPath = this.file.opts.filename
          if (!this.opts.disableTestExclude && shouldSkip(realPath, this.nycConfig)) {
            return
          }
          let { inputSourceMap } = this.opts
          if (this.opts.useInlineSourceMaps !== false) {
            if (!inputSourceMap && this.file.inputMap) {
              inputSourceMap = this.file.inputMap.sourcemap
            }
          }
          const visitorOptions = {}
          Object.entries(schema.defaults.instrumentVisitor).forEach(([name, defaultValue]) => {
            if (name in this.nycConfig) {
              visitorOptions[name] = this.nycConfig[name]
            } else {
              visitorOptions[name] = schema.defaults.instrumentVisitor[name]
            }
          })
          this.__dv__ = programVisitor(api, realPath, {
            ...visitorOptions,
            inputSourceMap
          })
          this.__dv__.enter(path)
        },
        exit (path) {
          if (!this.__dv__) {
            return
          }
          const result = this.__dv__.exit(path)
          if (this.opts.onCover) {
            this.opts.onCover(getRealpath(this.file.opts.filename), result.fileCoverage, result.sourceMappingURL)
          }
        }
      }
    }
  }
})
