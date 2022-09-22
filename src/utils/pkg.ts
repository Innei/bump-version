// @ts-check
import { join } from 'path'
import { argv } from 'zx'

import { readFileSync } from 'fs'
import semver from 'semver'

if (
  argv?.['version'] ||
  argv?.['v'] ||
  ['v', 'version'].includes(argv?.['_'][0])
) {
  const json = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), {
      encoding: 'utf-8',
    }),
  )

  console.log(json.version)

  process.exit(0)
}

export function getPackageJson() {
  const PKG_PATH = join(String(process.cwd()), '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length
  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
}

const releaseTypes = [
  'patch',
  'minor',
  'major',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]

export function generateReleaseTypes(
  currentVersion,
  types = releaseTypes,
  pried = 'alpha',
) {
  return types.map((item) => {
    const version = semver.inc(currentVersion, item, pried)
    return {
      name: `${item} - ${version}`,
      value: version,
    }
  })
}
