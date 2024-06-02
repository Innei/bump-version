import SemVer from 'semver'
import type { ReleaseType } from 'semver'

import { fetchGitRemoteTags, getGitSemVerTags } from '../utils/git.js'
import { releaseTypes } from '../utils/pkg.js'
import { getNextVersionWithTags } from '../utils/version.js'
import { resolveConfig } from './resolve-config.js'

export async function generateReleaseTypes(
  currentVersion: string,
  types = releaseTypes,
  pried = 'alpha',

  customReleaseTypes?: ReleaseType[],
) {
  const { withTags, remoteTags } = await resolveConfig()

  if (remoteTags) {
    await fetchGitRemoteTags()
  }

  const tags = await getGitSemVerTags()

  return Promise.all(
    (customReleaseTypes || types).map(async (releaseType) => {
      let version: string

      if (withTags) {
        version = getNextVersionWithTags({
          currentVersion,
          releaseType,
          tags,
        })
      } else {
        version = SemVer.inc(currentVersion, releaseType, pried)
      }
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
