import { readFileSync } from 'fs'
import { join } from 'path'
import semver from 'semver'

import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from '../constants/path.js'
import { getIdentifier } from './version.js'

export const getPackageJson = () => {
  const PKG_PATH = join(WORKSPACE_DIR, '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length
  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
}

export const memoedPackageJson = getPackageJson()

export const getRootPackageJson = () => {
  const PKG_PATH = join(ROOT_WORKSPACE_DIR, '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length

  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
}

export const memoedRootPackageJson = getRootPackageJson()

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
