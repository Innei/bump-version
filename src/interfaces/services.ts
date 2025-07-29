// 服务接口定义
import type {
  BumpOptions,
  BumpResult,
  ExecutionState,
  GitInfo,
  PackageInfo,
  ReleaseType,
} from '../types/index.js'

export interface IBumpService {
  execute(options: BumpOptions): Promise<BumpResult>
  validateOptions(options: BumpOptions): Promise<void>
  createExecutionContext(options: BumpOptions): Promise<IExecutionContext>
}

export interface IVersionService {
  getCurrentVersion(packagePath: string): Promise<string>
  resolveTargetVersion(
    current: string,
    releaseType: ReleaseType,
    preId?: string,
  ): string
  validateVersion(version: string): boolean
  updatePackageVersion(packagePath: string, version: string): Promise<void>
}

export interface IGitService {
  getInfo(): Promise<GitInfo>
  isClean(): Promise<boolean>
  createTag(tag: string, message: string): Promise<void>
  push(withTags?: boolean): Promise<void>
  commit(message: string, files: string[]): Promise<void>
  getLatestTag(): Promise<string | null>
  getCommitsSinceTag(tag: string): Promise<number>
}

export interface IPackageService {
  getPackageInfo(path: string): Promise<PackageInfo>
  getWorkspacePackages(): Promise<PackageInfo[]>
  publish(packagePath: string, options?: PublishOptions): Promise<void>
  validatePackage(packagePath: string): Promise<void>
}

export interface IHookService {
  executeHooks(phase: HookPhase, context: IExecutionContext): Promise<void>
  registerHook(phase: HookPhase, hook: Hook): void
  getHooks(phase: HookPhase): Hook[]
}

export interface IConfigService {
  resolveConfig(options: BumpOptions): Promise<ResolvedConfig>
  loadConfigFile(path?: string): Promise<Partial<BumpConfig>>
  validateConfig(config: BumpConfig): void
}

export interface IExecutionContext {
  readonly options: BumpOptions
  readonly config: ResolvedConfig
  readonly packageInfo: PackageInfo
  readonly gitInfo: GitInfo

  getState(): ExecutionState
  setState(state: Partial<ExecutionState>): void

  getCurrentVersion(): string
  getTargetVersion(): string | undefined
  setTargetVersion(version: string): void

  addRollbackAction(action: RollbackAction): void
  executeRollback(): Promise<void>

  emit(event: string, data?: any): void
  on(event: string, handler: EventHandler): void
}

// 配置相关接口
export interface ResolvedConfig extends BumpConfig {
  projectRoot: string
  workspacePackages: string[]
  resolvedHooks: ResolvedHooks
}

export interface BumpConfig {
  // Git 相关
  tag: boolean
  tagPrefix: string
  push: boolean
  commit: boolean
  commitMessage: string
  allowDirty: boolean
  allowedBranches: (AllowedBranchConfig | string)[]

  // 版本相关
  withTags: boolean
  remoteTags: boolean

  // 发布相关
  publish: boolean
  publishRegistry?: string
  publishAccess?: 'public' | 'restricted'

  // 钩子相关
  hooks: HookConfig

  // 插件相关
  plugins: PluginConfig[]

  // 工作空间相关
  mode: 'independent' | 'monorepo'
  packages: string[]

  // 变更日志
  changelog: boolean | ChangelogConfig
}

export interface HookConfig {
  preVersion: (string | Hook)[]
  postVersion: (string | Hook)[]
  prePublish: (string | Hook)[]
  postPublish: (string | Hook)[]
}

export interface ResolvedHooks {
  preVersion: Hook[]
  postVersion: Hook[]
  prePublish: Hook[]
  postPublish: Hook[]
}

// 钩子相关类型
export type HookPhase =
  | 'preVersion'
  | 'postVersion'
  | 'prePublish'
  | 'postPublish'

export interface Hook {
  name: string
  execute(context: IExecutionContext): Promise<void>
  rollback?(context: IExecutionContext): Promise<void>
}

export type EventHandler = (data?: any) => void | Promise<void>

// 其他辅助类型
export interface PublishOptions {
  registry?: string
  access?: 'public' | 'restricted'
  tag?: string
  dryRun?: boolean
}

export interface AllowedBranchConfig {
  name: string
  allowTypes?: ReleaseType[]
  disallowTypes?: ReleaseType[]
}

export interface ChangelogConfig {
  enable: boolean
  file?: string
  preset?: string
  releaseCount?: number
}

export interface PluginConfig {
  name: string
  options?: Record<string, any>
}

export interface RollbackAction {
  description: string
  execute(): Promise<void>
}
