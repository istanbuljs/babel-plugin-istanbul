import t from 'libtap'
import * as babel from '@babel/core'
import plugin from '../src'
import path from 'path'

t.test('shouldSkip: include', async t => {
  const babelrc = {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        excludeNodeModules: false,
        exclude: ['node_modules/**'],
        include: [
          'fixtures/node_modules/should-cover.js',
          'fixtures/plugin-should-cover.js'
        ]
      }]
    ]
  }

  t.match(babel.transformFileSync('./fixtures/plugin-should-cover.js', babelrc).code, /statementMap/)
  t.notMatch(babel.transformFileSync('./fixtures/plugin-should-not-cover.js', babelrc).code, /statementMap/)
  t.match(babel.transformFileSync('./fixtures/node_modules/should-cover.js', babelrc).code, /statementMap/)
  t.notMatch(babel.transformFileSync('./fixtures/node_modules/should-not-cover.js', babelrc).code, /statementMap/)
})

t.test('onCover', async t => {
  let result = []
  babel.transformFileSync('./fixtures/plugin-should-cover.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        onCover: (...args) => {
          result = args
        },
        include: ['fixtures/plugin-should-cover.js']
      }]
    ]
  })
  t.equal(result.length, 2)
  t.equal(result[0], path.resolve('./fixtures/plugin-should-cover.js'))
  t.match(result[1], {
    path: path.resolve('./fixtures/plugin-should-cover.js'),
    statementMap: Object,
    fnMap: Object,
    branchMap: Object,
    s: Object,
    f: Object,
    b: Object
  })
})

t.test('source-maps', async t => {
  const istanbulConfig = {
    include: ['fixtures/has-inline-source-map.js']
  }
  const babelrc = {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, istanbulConfig]
    ]
  }

  t.match(babel.transformFileSync('./fixtures/has-inline-source-map.js', babelrc).code, /inputSourceMap/)

  istanbulConfig.useInlineSourceMaps = false
  t.notMatch(babel.transformFileSync('./fixtures/has-inline-source-map.js', babelrc).code, /inputSourceMap/)
  delete istanbulConfig.useInlineSourceMaps

  istanbulConfig.inputSourceMap = { asdfQwer: 'foo' }
  t.match(babel.transformFileSync('./fixtures/has-inline-source-map.js', babelrc).code, /inputSourceMap:\s*{\s*asdfQwer: "foo"\s*}/)
})

t.test('coverageVariable option', async t => {
  const { code } = babel.transformFileSync('./fixtures/should-cover.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/should-cover.js'],
        coverageVariable: '__TEST_VARIABLE__'
      }]
    ]
  })
  t.match(code, /__TEST_VARIABLE__/)
  t.notMatch(code, /__coverage__/)
})

t.test('coverageGlobalScope option', async t => {
  const { code } = babel.transformFileSync('./fixtures/should-cover.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/should-cover.js'],
        coverageGlobalScope: 'window'
      }]
    ]
  })
  t.match(code, /new Function\("return window"\)/)
  t.notMatch(code, /new Function\("return this"\)/)
})

t.test('coverageGlobalScope option', async t => {
  const { code } = babel.transformFileSync('./fixtures/should-cover.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/should-cover.js'],
        coverageGlobalScopeFunc: false
      }]
    ]
  })
  t.match(code, /global\s*=\s*this/)
  t.notMatch(code, /global\s*=\s*new Function\("return this"\)/)
})

t.test('ignoreClassMethods option', async t => {
  const { code } = babel.transformFileSync('./fixtures/class-functions.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/class-functions.js'],
        ignoreClassMethods: ['bar']
      }]
    ]
  })

  // bar() is ignored
  t.match(code, /bar\(\)\s*{\s*}/)
  t.notMatch(code, /bar\(\)\s*{\s*cov_.*/)

  // barz() does not get ignored
  t.match(code, /barz\(\)\s*{\s*cov_.*/)
  t.notMatch(code, /barz\(\)\s*{\s*}/)
})

t.test('process.env.NYC_CONFIG', async t => {
  const babelrc = {
    babelrc: false,
    configFile: false,
    plugins: [plugin]
  }
  t.match(babel.transformFileSync('./fixtures/should-cover.js', babelrc).code, /statementMap/)
  t.notMatch(babel.transformFileSync('./fixtures/should-not-cover.js', babelrc).code, /statementMap/)

  t.spawn(process.execPath, [path.resolve('test/no-nyc-config.js')])
})

// regression test for https://github.com/istanbuljs/babel-plugin-istanbul/issues/78
t.test('should instrument: export const foo = () => {}', async t => {
  const { code } = babel.transformFileSync('./fixtures/issue-78.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/issue-78.js']
      }]
    ]
  })
  t.match(code, /statementMap/)
})

// regression test for https://github.com/istanbuljs/babel-plugin-istanbul/issues/201
t.test('should not conflict with transform-modules-commonjs', async t => {
  const { code } = babel.transformFileSync('./fixtures/issue-201.js', {
    babelrc: false,
    configFile: false,
    plugins: [
      [plugin, {
        include: ['fixtures/issue-201.js']
      }],
      '@babel/plugin-transform-modules-commonjs'
    ]
  })
  t.match(code, /_path.*\.resolve\)\(_path\)/)
  t.notMatch(code, /_path\.resolve\)\(_path\)/)
})
