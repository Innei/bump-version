import type { ReleaseType } from 'semver'
import SemVer from 'semver'

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
  const sortedTags = tags.concat().sort(SemVer.compare)
  const reversedTags = sortedTags.reverse()

  const nextVersion = SemVer.inc(currentVersion, releaseType)

  const identifier = getIdentifier(currentVersion)
  const nextIdentifier = identifier || 'alpha'
  // 1. handle major minor patch
  switch (releaseType) {
    case 'premajor':
    case 'major': {
      // 1.x.x

      const latestOfMajor = reversedTags[0]

      return SemVer.inc(latestOfMajor, releaseType, nextIdentifier)
    }
    case 'preminor':
    case 'minor': {
      // x.1.x

      const major = SemVer.major(nextVersion)
      const latestOfMajorIndex = reversedTags.findIndex((tag) => {
        return SemVer.major(tag) === major
      })

      const latestOfMajor = reversedTags[latestOfMajorIndex]

      return SemVer.inc(latestOfMajor, releaseType, nextIdentifier)
    }
    case 'prepatch':
    case 'patch': {
      // x.1.x

      const minor = SemVer.minor(nextVersion)
      const major = SemVer.major(nextVersion)
      const latestOfMajorIndex = reversedTags.findIndex((tag) => {
        return SemVer.minor(tag) === minor && SemVer.major(tag) === major
      })

      const latestOfMajor = reversedTags[latestOfMajorIndex]

      return SemVer.inc(latestOfMajor, releaseType, nextIdentifier)
    }
  }

  const existIndex = sortedTags.findIndex((tag) => tag === nextVersion)
  if (existIndex === -1) {
    return nextVersion
  }
}
