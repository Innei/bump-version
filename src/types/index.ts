import type { ReleaseType as SemverReleaseType } from 'semver'

// 核心类型定义

export interface BumpResult {
  success: boolean
  previousVersion: string
  newVersion: string
  releaseType: ReleaseType
  publishedPackages: string[]
  createdTags: string[]
  executionTime: number
  errors?: BumpError[]
}

export interface BumpOptions {
  targetVersion?: string
  releaseType?: ReleaseType
  dryRun?: boolean
  skipHooks?: boolean
  skipTests?: boolean
  skipPublish?: boolean
  force?: boolean
  filter?: string
  configPath?: string
}

export interface BumpError {
  code: string
  message: string
  cause?: Error
  context?: Record<string, any>
}

// 扩展 semver 的 ReleaseType 以支持自定义类型
export type ReleaseType = SemverReleaseType | 'branch' | 'custom'

// 用于内部处理的更严格的类型
export type StrictReleaseType = SemverReleaseType
export type CustomReleaseType = 'branch' | 'custom'

export interface PackageInfo {
  name: string
  version: string
  path: string
  packageJson: Record<string, any>
  dependencies: string[]
  devDependencies: string[]
}

export interface GitInfo {
  currentBranch: string
  latestTag?: string
  hasUncommittedChanges: boolean
  remoteUrl?: string
  commitsSinceLastTag: number
}

export interface ExecutionState {
  phase: ExecutionPhase
  targetVersion?: string
  modifiedFiles: string[]
  createdTags: string[]
  publishedPackages: string[]
  rollbackActions: RollbackAction[]
}

export type ExecutionPhase =
  | 'initializing'
  | 'validating'
  | 'resolving-version'
  | 'pre-hooks'
  | 'updating-version'
  | 'post-hooks'
  | 'publishing'
  | 'finalizing'
  | 'error'
  | 'completed'

export interface RollbackAction {
  type: 'file-restore' | 'tag-delete' | 'commit-revert' | 'publish-unpublish'
  description: string
  execute: () => Promise<void>
}
