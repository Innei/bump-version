import type conventionalChangelog from 'conventional-changelog'

export interface BumpConfig {
  tag: string
  leading: string[]
  /**
   * @deprecated
   */
  before: string[]
  /**
   * @deprecated
   */
  after: string[]
  trailing: string[]
  push: boolean
  commitMessage: string
  publish: boolean
  changelog: boolean | ChangelogOptions
  allowedBranches: (AllowedBranchesOptions | string)[]
  tagPrefix: string

  mode: 'monorepo' | 'independent'
  packages: string[]

  withTags: boolean
  remoteTags: boolean
}

type ReleaseType =
  | 'patch'
  | 'minor'
  | 'major'
  | 'premajor'
  | 'preminor'
  | 'prepatch'
  | 'prerelease'

export interface AllowedBranchesOptions {
  name: string
  disallowTypes: ReleaseType[]
  allowTypes: ReleaseType[]
}

export type ChangelogOptions = Parameters<typeof conventionalChangelog>[0] & {
  enable: boolean
}
