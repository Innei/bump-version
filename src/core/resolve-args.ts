import { argv } from 'zx'

export const resolveArgs = () => {
  return {
    // 'patch',
    // 'minor',
    // 'major',
    // 'premajor',
    // 'preminor',
    // 'prepatch',
    // 'prerelease',
    prerelease: argv['prerelease'] || argv['alpha'] || false,
    patch: argv['patch'] || false,
    minor: argv['minor'] || false,
    major: argv['major'] || false,
    premajor: argv['premajor'] || false,
    preminor: argv['preminor'] || false,
    prepatch: argv['prepatch'] || false,
  }
}