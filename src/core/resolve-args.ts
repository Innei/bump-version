import { argv } from 'zx'

export const resolveArgs = () => {
  /**
   * --filter packages/query
   * -f packages/query
   */

  const filter = argv['f'] || argv['filter']

  return {
    filter,

    // version controll
    prerelease: argv['prerelease'] || argv['alpha'] || false,
    patch: argv['patch'] || false,
    minor: argv['minor'] || false,
    major: argv['major'] || false,
    premajor: argv['premajor'] || false,
    preminor: argv['preminor'] || false,
    prepatch: argv['prepatch'] || false,
  }
}
