#!/usr/bin/env node
'use strict'

const { loadNycConfig } = require('@istanbuljs/load-nyc-config')
const isElectron = process.versions && process.versions.electron

async function main () {
  const [cwd, nycrcPath] = process.argv.slice(2)

  console.log(JSON.stringify(await loadNycConfig({ cwd, nycrcPath })))
  if (isElectron) process.exit(0)
}

main().catch(error => {
  console.log(JSON.stringify({ 'load-nyc-config-sync-error': error.message }))
  if (isElectron) process.exit(1)
})
