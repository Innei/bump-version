import type { ReleaseType } from 'semver'
import SemVer, { compare } from 'semver'

export const nextIdentifierMap = {
  alpha: 'beta',
  beta: 'canary',
  canary: 'rc',
}

export const getIdentifier = (currentVersion: string) => {
  const identifier = currentVersion.match(/\d+\.\d+\.\d+-(.*?)\.\d+/)?.[1]

  return identifier
}

export const getNextIdentifier = (
  currentVersion: string,
  releaseType?: string,
) => {
  const identifier = getIdentifier(currentVersion)

  // if is stable version, the next identifier is undefined
  // otherwise is alpha
  return identifier
    ? nextIdentifierMap[identifier]
    : releaseType.startsWith('pre')
    ? 'alpha'
    : undefined
}

export const getNextVersionWithTags = ({
  currentVersion,
  releaseType,
  tags,
}: {
  currentVersion: string
  releaseType: ReleaseType
  tags: string[]
}) => {
  const sortedTags = tags.concat().sort(compare)

  const nextVersion = SemVer.inc(currentVersion, releaseType)
  const existIndex = sortedTags.findIndex((tag) => tag === nextVersion)
  if (existIndex === -1) {
    return nextVersion
  }
  // 1. handle major minor patch
  switch (releaseType) {
    case 'major': {
      // 1.x.x
      break
    }
    case 'minor': {
      break
    }
    case 'patch': {
      break
    }
  }

  return existIndex
}
