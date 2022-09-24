// @ts-check
import { join } from 'path'

import { readFileSync } from 'fs'
import semver from 'semver'

export function getPackageJson() {
  const PKG_PATH = join(String(process.cwd()), '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length
  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
}

export const releaseTypes: semver.ReleaseType[] = [
  'patch',
  'minor',
  'major',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]

export const getNextVersion = (
  currentVersion: string,
  releaseType: semver.ReleaseType,
) => {
  return semver.inc(currentVersion, releaseType)
}

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
