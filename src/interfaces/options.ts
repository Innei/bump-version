export interface BumpOptions {
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
  publish: string
  changelog: boolean
  allowedBranches: (AllowedBranchesOptions | string)[]
  tagPrefix: string

  mode: 'monorepo' | 'independent'
  packages: string[]
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
