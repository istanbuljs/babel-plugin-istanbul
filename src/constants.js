import { createHash } from 'crypto'

// We should avoid changing this at all costs.
const versionString = 'istanbul-lib-instrument@4'

// function to use for creating hashes
export const SHA = 'sha1'
// name of coverage data magic key
export const MAGIC_KEY = '_coverageSchema'
// name of coverage data magic value
export const MAGIC_VALUE = createHash(SHA)
  .update(versionString)
  .digest('hex')
