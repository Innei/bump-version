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

  const _ = argv['_']
  const _set = new Set(_)

  const getVersionTypeFlag = (type: string): boolean => {
    return _set.has(type) || argv[type] || false
  }

  return {
    v,
    rcPath: customRcFile,

    // argv
    filter,
    dryRun,
    tagPrefix,

    // version controll
    prerelease: getVersionTypeFlag('alpha') || getVersionTypeFlag('prerelease'),
    patch: getVersionTypeFlag('patch'),
    minor: getVersionTypeFlag('minor'),
    major: getVersionTypeFlag('major'),
    premajor: getVersionTypeFlag('premajor'),
    preminor: getVersionTypeFlag('preminor'),
    prepatch: getVersionTypeFlag('prepatch'),
  }
})
