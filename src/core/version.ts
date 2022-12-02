import type { ReleaseType } from 'semver'
import SemVer from 'semver'

import { getGitTags } from '../utils/git.js'
import { releaseTypes } from '../utils/pkg.js'
import { getNextVersionWithTags } from '../utils/version.js'
import { resolveConfig } from './resolve-config.js'

export function generateReleaseTypes(
  currentVersion: string,
  types = releaseTypes,
  pried = 'alpha',

  customReleaseTypes?: ReleaseType[],
) {
  const { withTags } = resolveConfig()
  return Promise.all(
    (customReleaseTypes || types).map(async (releaseType) => {
      const version = withTags
        ? getNextVersionWithTags({
            currentVersion,
            releaseType,
            tags: await getGitTags(),
          })
        : SemVer.inc(currentVersion, releaseType, pried)
      return {
        name: `${releaseType} - ${version}`,
        value: version,

        extra: {
          releaseType,
          pried,
        },
      }
    }),
  )
}
