import t from 'libtap'
import * as babel from '@babel/core'
import plugin from '../src'

const OLD_NYC_CONFIG = process.env.NYC_CONFIG
const OLD_NYC_CWD = process.env.NYC_CWD

delete process.env.NYC_CONFIG
delete process.env.NYC_CWD

const babelrc = {
  babelrc: false,
  configFile: false,
  plugins: [plugin]
}

t.match(babel.transformFileSync('./fixtures/should-cover.js', babelrc).code, /statementMap/)
// Default istanbuljs options allow fixtures/should-not-cover.js
t.match(babel.transformFileSync('./fixtures/should-not-cover.js', babelrc).code, /statementMap/)

process.env.NYC_CONFIG = OLD_NYC_CONFIG
process.env.NYC_CWD = OLD_NYC_CWD
