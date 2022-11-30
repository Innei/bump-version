import { readFileSync } from 'fs'
import { join } from 'path'
import semver from 'semver'

import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from '../constants/path.js'
import { memoReturnValueFunction } from './memo.js'
import { getIdentifier } from './version.js'

export const getPackageJson = memoReturnValueFunction(() => {
  const PKG_PATH = join(WORKSPACE_DIR, '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length
  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
})

export const getRootPackageJson = memoReturnValueFunction(() => {
  const PKG_PATH = join(ROOT_WORKSPACE_DIR, '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length

  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
})

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
  identifier?: string,
) => {
  const nextIdentifier = getIdentifier(currentVersion)
  return semver.inc(
    currentVersion,
    releaseType,
    identifier || nextIdentifier
      ? nextIdentifier
      : releaseType.startsWith('pre')
      ? 'alpha'
      : undefined,
  )
}

export function generateReleaseTypes(
  currentVersion,
  types = releaseTypes,
  pried = 'alpha',

  customReleaseTypes?: semver.ReleaseType[],
) {
  return (customReleaseTypes || types).map((releaseType) => {
    const version = semver.inc(currentVersion, releaseType, pried)
    return {
      name: `${releaseType} - ${version}`,
      value: version,

      extra: {
        releaseType,
        pried,
      },
    }
  })
}
