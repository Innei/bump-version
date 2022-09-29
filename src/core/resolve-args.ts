import { argv } from 'zx'

import { memoReturnValueFunction } from '../utils/memo.js'

export const resolveArgs = memoReturnValueFunction(() => {
  /**
   * --filter packages/query
   * -f packages/query
   */

  const filter: string = argv['f'] || argv['filter']
  const dryRun: boolean = argv['dry-run'] || argv['dryRun']
  const tagPrefix: string = argv['tag-prefix'] || argv['t']
  const v: boolean = argv['v'] || argv['version']
  const customRcFile: string = argv['c'] || argv['config']

  return {
    v,
    rcPath: customRcFile,

    // argv
    filter,
    dryRun,
    tagPrefix,

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
