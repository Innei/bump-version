import { argv } from 'zx'
import { memoReturnValueFunction } from '../utils/memo.js'

export const resolveArgs = memoReturnValueFunction(() => {
  /**
   * --filter packages/query
   * -f packages/query
   */

  const filter = argv['f'] || argv['filter']
  const dryRun = argv['dry-run'] || argv['dryRun']

  return {
    filter,
    dryRun,

    // version controll
    prerelease: argv['prerelease'] || argv['alpha'] || false,
    patch: argv['patch'] || false,
    minor: argv['minor'] || false,
    major: argv['major'] || false,
    premajor: argv['premajor'] || false,
    preminor: argv['preminor'] || false,
    prepatch: argv['prepatch'] || false,
  }
})
