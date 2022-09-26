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
  allowedBranches: string[]
  tagPrefix: string
}
