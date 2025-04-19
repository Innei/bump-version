import SemVer from 'semver'
import type { ReleaseType } from 'semver'

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

  const identifier = getIdentifier(currentVersion)
  const nextIdentifier = identifier || 'alpha'
  const nextVersion = SemVer.inc(currentVersion, releaseType, nextIdentifier)

  const getNextVersion = () => {
    if (sortedTags.length === 0) {
      return nextVersion
    }
    // 0. handle prerelease if own identifier
    if (identifier) {
      switch (releaseType) {
        case 'prerelease': {
          // 1.0.0-alpha.0 -> 1.0.0-alpha.1

          const minor = SemVer.minor(nextVersion)
          const major = SemVer.major(nextVersion)
          const patch = SemVer.patch(nextVersion)

          const latestIndex = reversedTags.findIndex((tag) => {
            return (
              SemVer.major(tag) === major &&
              SemVer.minor(tag) === minor &&
              SemVer.patch(tag) === patch &&
              getIdentifier(tag) === identifier
            )
          })

          const lastest = reversedTags[latestIndex]

          if (!lastest) {
            return
          }

          return SemVer.inc(lastest, 'prerelease', identifier)
        }
      }
    }

    // 1. handle major minor patch
    switch (releaseType) {
      case 'premajor':
      case 'major': {
        // 1.x.x

        const latestOfMajor = reversedTags[0]

        if (!latestOfMajor) {
          return
        }

        return SemVer.inc(latestOfMajor, releaseType, nextIdentifier)
      }
      case 'preminor':
      case 'minor': {
        // x.1.x

        const major = SemVer.major(nextVersion)
        const lastIndex = reversedTags.findIndex((tag) => {
          return SemVer.major(tag) === major
        })

        const latest = reversedTags[lastIndex]

        if (!latest) return

        return SemVer.inc(latest, releaseType, nextIdentifier)
      }
      case 'prepatch':
      case 'patch': {
        // x.1.x

        const minor = SemVer.minor(nextVersion)
        const major = SemVer.major(nextVersion)
        const lastIndex = reversedTags.findIndex((tag) => {
          return SemVer.minor(tag) === minor && SemVer.major(tag) === major
        })

        const latest = reversedTags[lastIndex]

        if (!latest) {
          return
        }

        return SemVer.inc(latest, releaseType, nextIdentifier)
      }
      case 'prerelease': {
        const minor = SemVer.minor(nextVersion)
        const major = SemVer.major(nextVersion)

        const latestIndex = reversedTags.findIndex((tag) => {
          return SemVer.major(tag) === major && SemVer.minor(tag) === minor
        })

        const lastest = reversedTags[latestIndex]

        if (!lastest) {
          return
        }

        // this will be prepatch, is is not a bug

        return SemVer.inc(lastest, 'prepatch', nextIdentifier)
      }
    }
  }

  const result = getNextVersion()

  if (result) {
    return result
  }

  const existIndex = sortedTags.indexOf(nextVersion)
  if (existIndex === -1) {
    return nextVersion
  }
}
