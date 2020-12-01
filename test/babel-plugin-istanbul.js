import t from 'libtap'
import * as babel from '@babel/core'
import plugin, { readCoverage } from '../src'
import { MAGIC_VALUE } from '../src/constants'
import path from 'path'

const rawInstrument = (source, ...options) => babel.transformSync(source, {
  babelrc: false,
  configFile: false,
  filename: path.resolve('src/example.js'),
  compact: true,
  comments: false,
  parserOpts: {
    plugins: [
      'classProperties',
      'classPrivateProperties'
    ]
  },
  plugins: [
    [plugin, ...options]
  ]
}).code

const instrument = (source, ...options) => rawInstrument(source, ...options).replace(/\bcov_[^(]+\(\)/g, 'cov')

const executeReadCoverage = source => {
  return readCoverage(
    babel,
    babel.parseSync(source, {
      babelrc: false,
      configFile: false
    })
  )
}

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
  t.equal(result.length, 3)
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
  t.match(result[2], undefined)
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

  let done
  t.match(
    instrument('/* foobar */ output = args[0]\n// @sourceMappingURL=foo.map', {
      onCover (filename, coverageData, sourceMappingURL) {
        t.equal(sourceMappingURL, 'foo.map')
        done = true
      }
    }),
    'cov;cov.s[0]++;output=args[0];'
  )
  t.equal(done, true)
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
  const code = instrument(`class Foo1 {
  bar() {}
  barz() {}
}

function Foo2() {}
Foo2.prototype.bar = function bar() {}
Foo2.prototype.barz = function barz() {}
`, { ignoreClassMethods: ['bar'] })

  t.match(
    code,
    'cov;' +
    'class Foo1{bar(){}barz(){cov.f[0]++;}}' +
    'function Foo2(){cov.f[1]++;}' +
    'cov.s[0]++;Foo2.prototype.bar=function bar(){};' +
    'cov.s[1]++;Foo2.prototype.barz=function barz(){cov.f[2]++;};'
  )
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

t.test('Function binding', async t => {
  t.match(instrument('const Function = 1;'), 'var Function=function(){}.constructor;')
  t.notMatch(instrument('const Func = 1;'), 'var Function=function(){}.constructor;')
  t.notMatch(instrument('function test() { var Function = 1; }'), 'var Function=function(){}.constructor;')
})

t.test('double-instrument', async t => {
  const code1 = rawInstrument('const f = 1;')
  const code2 = rawInstrument(code1)
  t.equal(code1, code2)
})

t.test('assignment pattern', async t => {
  t.match(
    instrument('({a = 24} = {})'),
    'cov;cov.s[0]++;({a=(cov.b[0][0]++,24)}={});'
  )
})

t.test('logical', async t => {
  const logicalExp = logic => t.match(
    instrument(`const a = b ${logic} 1`),
    `cov;const a=(cov.s[0]++,(cov.b[0][0]++,b)${logic}(cov.b[0][1]++,1));`
  )
  logicalExp('||')
  logicalExp('&&')
  logicalExp('??')
  t.match(instrument('const a = b || /* istanbul ignore next */1;'), 'cov;const a=(cov.s[0]++,(cov.b[0][0]++,b)||1);')
  t.match(
    instrument('var x = args[0] > 0 && (args[0] < 5 || args[0] > 10);'),
    'cov;var x=(cov.s[0]++,(cov.b[0][0]++,args[0]>0)&&((cov.b[0][1]++,args[0]<5)||(cov.b[0][2]++,args[0]>10)));'
  )
  t.match(
    instrument('var x = args[0] === 1 || /* istanbul ignore next */ (args[0] === 2 || args[0] === 3)'),
    'cov;var x=(cov.s[0]++,(cov.b[0][0]++,args[0]===1)||args[0]===2||args[0]===3);'
  )
})

t.test('ternary', async t => {
  t.match(instrument('const a = b ? 1 : 2'), 'cov;const a=(cov.s[0]++,b?(cov.b[0][0]++,1):(cov.b[0][1]++,2));')
  t.match(instrument('const a = b ? /* istanbul ignore next */ 1 : 2'), 'cov;const a=(cov.s[0]++,b?1:(cov.b[0][0]++,2));')
  t.match(instrument('const a = b ? 1 : /* istanbul ignore next */ 2'), 'cov;const a=(cov.s[0]++,b?(cov.b[0][0]++,1):2);')
})

t.test('switch', async t => {
  t.match(instrument('switch (a) {}'), 'cov;cov.s[0]++;switch(a){}')
  t.match(
    instrument('switch (a) { case 1: break; default: break; }'),
    'cov;cov.s[0]++;switch(a){case 1:cov.b[0][0]++;cov.s[1]++;break;default:cov.b[0][1]++;cov.s[2]++;break;}'
  )
})

t.test('arrow function', async t => {
  t.match(instrument('const a = () => {}'), 'cov;cov.s[0]++;const a=()=>{cov.f[0]++;};')
  t.match(instrument('const a = async () => {}'), 'cov;cov.s[0]++;const a=async()=>{cov.f[0]++;};')
  t.match(instrument('const a = () => 1'), 'cov;cov.s[0]++;const a=()=>{cov.f[0]++;cov.s[1]++;return 1;};')
  t.match(instrument('const a = async () => 1'), 'cov;cov.s[0]++;const a=async()=>{cov.f[0]++;cov.s[1]++;return 1;};')
})

t.test('if', async t => {
  t.match(instrument('if (1) a = 1'), 'cov;cov.s[0]++;if(1){cov.b[0][0]++;cov.s[1]++;a=1;}else{cov.b[0][1]++;}')
})

t.test('class', async t => {
  t.match(instrument('class A {}'), 'cov;class A{}')
  t.match(instrument('class A extends B {}'), 'cov;class A extends B{}')
  // XXX should count the `B()` statement hit
  t.match(instrument('class A extends B() {}'), 'cov;class A extends(B()){}')
  t.match(instrument('class A { a = 1; }'), 'cov;class A{a=(cov.s[0]++,1);}')
  t.match(instrument('class A { #a = 1; }'), 'cov;class A{#a=(cov.s[0]++,1);}')
})

t.test('function in for initializer', async t => {
  t.match(
    instrument('for (var x = function(){ return 100; }, y = true; y; y = false){ output = x(); }'),
    'cov;cov.s[0]++;for(var x=(cov.s[1]++,function(){cov.f[0]++;cov.s[2]++;return 100;}),y=(cov.s[3]++,true);y;y=false){cov.s[4]++;output=x();}'
  )
})

t.test('istanbul ignore', async t => {
  t.notMatch(instrument('/*istanbul ignore file*/test();'), /statementMap/)
  t.match(instrument('/*istanbul ignore next*/test1();test2();'), 'cov;test1();cov.s[0]++;test2()')
  t.match(instrument('/*istanbul ignore next*/if(a) {}'), 'cov;if(a){}')
  t.match(instrument('/*istanbul ignore if*/if(a) {}'), 'cov;cov.s[0]++;if(a){}else{cov.b[0][0]++;}')
  t.match(instrument('/*istanbul ignore else*/if(a) {}b'), 'cov;cov.s[0]++;if(a){cov.b[0][0]++;}else{}cov.s[1]++;')
})

t.test('read coverage', async t => {
  const sourceFile = path.resolve('src/example.js')
  const coverage = executeReadCoverage(rawInstrument('if (1) {}'))
  t.same(coverage, {
    path: sourceFile,
    hash: coverage.hash,
    gcv: '__coverage__',
    coverageData: {
      path: sourceFile,
      statementMap: {
        0: {
          start: { line: 1, column: 0 },
          end: { line: 1, column: 9 }
        }
      },
      s: { 0: 0 },
      branchMap: {
        0: {
          type: 'if',
          loc: {
            start: { line: 1, column: 0 },
            end: { line: 1, column: 9 }
          },
          locations: [
            {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 9 }
            },
            {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 9 }
            }
          ],
          line: 1
        }
      },
      b: { 0: [0, 0] },
      fnMap: {},
      f: {}
    }
  })

  const constructBroken = (magicKey, magicValue = JSON.stringify(MAGIC_VALUE), hash = '"hash"', gcv = 'gcv') => `
function cov_14lhcnf5qm(){
  var path="${sourceFile}";
  var hash=${hash};
  var global=new Function("return this")();
  var ${gcv}="__coverage__";
  var coverageData={
    path:"${sourceFile}",
    statementMap:{},
    fnMap:{},
    branchMap:{},
    s:{},
    f:{},
    b:{},
    ${magicKey}:${magicValue},
    hash:${hash}
  };
  var coverage=global[gcv]||(global[gcv]={});
  if(!coverage[path]||coverage[path].hash!==hash){
    coverage[path]=coverageData;
  }
  var actualCoverage=coverage[path];
  {cov_14lhcnf5qm=function(){return actualCoverage;};}
  return actualCoverage;
}
cov_14lhcnf5qm();`
  t.equal(executeReadCoverage(constructBroken('_coverageSchema', '"bad"')), null)
  t.equal(executeReadCoverage(constructBroken('_coverageSchema', undefined, 'broken')), null)
  t.equal(executeReadCoverage(constructBroken('_coverageSchema', undefined, undefined, 'notgcv')), null)
})
