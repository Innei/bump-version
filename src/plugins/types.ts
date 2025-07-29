// 插件系统类型定义
import type {
  Hook,
  HookPhase,
  IExecutionContext,
} from '../interfaces/services.js'

export interface Plugin {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly author?: string

  // 插件生命周期
  initialize?: (context: IPluginContext) => Promise<void>
  configure?: (config: PluginConfig) => void
  destroy?: () => Promise<void>

  // 钩子注册
  getHooks?: () => PluginHooks

  // 能力扩展
  extendConfig?: (config: any) => any
  extendContext?: (context: IExecutionContext) => void
}

export interface PluginHooks {
  preVersion?: Hook[]
  postVersion?: Hook[]
  prePublish?: Hook[]
  postPublish?: Hook[]
}

export interface IPluginContext {
  readonly pluginName: string
  readonly config: PluginConfig
  readonly rootConfig: any

  log: PluginLogger
  utils: PluginUtils

  emit: (event: string, data?: any) => void
  on: (event: string, handler: (data?: any) => void) => void

  getStorage: () => PluginStorage
}

export interface PluginConfig {
  enabled: boolean
  options: Record<string, any>
}

export interface PluginLogger {
  debug: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
}

export interface PluginUtils {
  // 版本工具
  version: {
    inc: (version: string, type: string, preId?: string) => string
    valid: (version: string) => boolean
    compare: (a: string, b: string) => number
  }

  // 文件工具
  fs: {
    exists: (path: string) => Promise<boolean>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
    copyFile: (src: string, dest: string) => Promise<void>
  }

  // Git 工具
  git: {
    getCurrentBranch: () => Promise<string>
    getLatestTag: () => Promise<string | null>
    isClean: () => Promise<boolean>
    exec: (command: string) => Promise<string>
  }

  // 进程工具
  exec: (command: string, options?: ExecOptions) => Promise<ExecResult>
}

export interface PluginStorage {
  get: <T = any>(key: string) => T | undefined
  set: <T = any>(key: string, value: T) => void
  delete: (key: string) => void
  clear: () => void
  has: (key: string) => boolean
}

export interface ExecOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  silent?: boolean
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

// 插件管理器接口
export interface IPluginManager {
  // 插件注册
  register: (plugin: Plugin) => void
  unregister: (pluginName: string) => void

  // 插件查找
  getPlugin: (name: string) => Plugin | undefined
  getPlugins: () => Plugin[]
  getEnabledPlugins: () => Plugin[]

  // 插件生命周期
  initializePlugins: (context: IExecutionContext) => Promise<void>
  destroyPlugins: () => Promise<void>

  // 钩子管理
  getHooks: (phase: HookPhase) => Hook[]
  executeHooks: (phase: HookPhase, context: IExecutionContext) => Promise<void>

  // 配置扩展
  extendConfig: (baseConfig: any) => any
}

// 内置插件接口
export interface GitPlugin extends Plugin {
  createTag: (name: string, message: string) => Promise<void>
  pushTags: () => Promise<void>
  commit: (message: string, files: string[]) => Promise<void>
}

export interface NpmPlugin extends Plugin {
  publish: (packagePath: string, options?: NpmPublishOptions) => Promise<void>
  whoami: () => Promise<string>
  version: () => Promise<string>
}

export interface ChangelogPlugin extends Plugin {
  generate: (options: ChangelogOptions) => Promise<string>
  write: (content: string, file: string) => Promise<void>
}

export interface NpmPublishOptions {
  registry?: string
  access?: 'public' | 'restricted'
  tag?: string
  dryRun?: boolean
}

export interface ChangelogOptions {
  tagPrefix?: string
  preset?: string
  releaseCount?: number
  outputFile?: string
}

// 插件配置
export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: string
  main: string
  keywords?: string[]
  repository?: string
  bugs?: string
  homepage?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  engines?: {
    bump?: string
    node?: string
  }
}

// 插件加载配置
export interface PluginLoadOptions {
  name: string
  source: PluginSource
  config?: PluginConfig
}

export type PluginSource =
  | { type: 'builtin'; name: string }
  | { type: 'npm'; package: string; version?: string }
  | { type: 'local'; path: string }
  | { type: 'url'; url: string }
