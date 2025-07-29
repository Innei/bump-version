import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig } from 'c12'
import type {
  BumpConfig,
  IConfigService,
  ResolvedConfig,
} from '../interfaces/services.js'
import type { BumpOptions } from '../types/index.js'

import { camelcaseKeys } from '../utils/camelcase-keys.js'

/**
 * 配置服务
 *
 * 职责：
 * - 加载和合并多层配置
 * - 验证配置有效性
 * - 提供配置访问接口
 * - 处理配置继承和覆盖
 */
export class ConfigService implements IConfigService {
  private configCache = new Map<string, ResolvedConfig>()

  /**
   * 解析配置
   */
  async resolveConfig(options: BumpOptions): Promise<ResolvedConfig> {
    const cacheKey = this.generateCacheKey(options)

    // 检查缓存
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!
    }

    try {
      // 加载配置文件
      const fileConfig = await this.loadConfigFile(options.configPath)

      // 获取默认配置
      const defaultConfig = this.getDefaultConfig()

      // 合并配置
      const mergedConfig = this.mergeConfigs(defaultConfig, fileConfig, options)

      // 解析和规范化配置
      const resolvedConfig = await this.normalizeConfig(mergedConfig, options)

      // 验证配置
      this.validateConfig(resolvedConfig)

      // 缓存配置
      this.configCache.set(cacheKey, resolvedConfig)

      return resolvedConfig
    } catch (error) {
      throw new Error(
        `Failed to resolve config: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 加载配置文件
   */
  async loadConfigFile(configPath?: string): Promise<Partial<BumpConfig>> {
    try {
      let config: any = {}

      if (configPath) {
        // 加载指定的配置文件
        const customConfigPath = resolve(process.cwd(), configPath)

        if (!existsSync(customConfigPath)) {
          throw new Error(`Custom config file not found: ${customConfigPath}`)
        }

        const { config: loadedConfig } = await loadConfig<Partial<BumpConfig>>({
          configFile: customConfigPath,
        })

        config = loadedConfig || {}
      } else {
        // 自动查找配置文件
        const { config: loadedConfig } = await loadConfig<Partial<BumpConfig>>({
          cwd: process.cwd(),
          name: 'bump',
          packageJson: true,
        })

        config = loadedConfig || {}
      }

      // 转换配置键为驼峰命名
      return camelcaseKeys(config)
    } catch (error) {
      if (configPath) {
        throw error // 指定配置文件时，加载失败应该抛出错误
      }

      // 自动查找时，没有配置文件不是错误
      return {}
    }
  }

  /**
   * 验证配置
   */
  validateConfig(config: ResolvedConfig): void {
    const errors: string[] = []

    // 验证工作空间模式
    if (config.mode === 'monorepo' && config.packages.length === 0) {
      errors.push('packages field is required in monorepo mode')
    }

    // 验证分支配置
    if (config.allowedBranches && config.allowedBranches.length > 0) {
      for (const branch of config.allowedBranches) {
        if (typeof branch === 'object') {
          if (!branch.name) {
            errors.push('Branch configuration must have a name')
          }

          if (branch.allowTypes && branch.disallowTypes) {
            const overlap = branch.allowTypes.filter((type) =>
              branch.disallowTypes!.includes(type),
            )
            if (overlap.length > 0) {
              errors.push(
                `Branch ${branch.name}: allowTypes and disallowTypes cannot overlap: ${overlap.join(', ')}`,
              )
            }
          }
        }
      }
    }

    // 验证标签前缀
    if (config.tagPrefix && !/^[\w\-.]+$/.test(config.tagPrefix)) {
      errors.push('tagPrefix contains invalid characters')
    }

    // 验证提交消息模板
    if (
      config.commitMessage &&
      !config.commitMessage.includes('$' + '{NEW_VERSION}')
    ) {
      console.warn(
        'Warning: commitMessage does not contain placeholder for NEW_VERSION',
      )
    }

    // 验证 changelog 配置
    if (
      typeof config.changelog === 'object' &&
      config.changelog.enable &&
      config.changelog.releaseCount &&
      config.changelog.releaseCount < 1
    ) {
      errors.push('changelog.releaseCount must be greater than 0')
    }

    if (errors.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
      )
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): BumpConfig {
    return {
      // Git 相关
      tag: true,
      tagPrefix: 'v',
      push: true,
      commit: true,
      commitMessage: 'release: v$' + '{NEW_VERSION}',
      allowDirty: false,
      allowedBranches: ['main', 'master'],

      // 版本相关
      withTags: false,
      remoteTags: false,

      // 发布相关
      publish: false,
      publishRegistry: undefined,
      publishAccess: 'public',

      // 钩子相关
      hooks: {
        preVersion: [],
        postVersion: [],
        prePublish: [],
        postPublish: [],
      },

      // 插件相关
      plugins: [],

      // 工作空间相关
      mode: 'independent',
      packages: [],

      // 变更日志
      changelog: false,
    }
  }

  /**
   * 合并配置
   */
  private mergeConfigs(
    defaultConfig: BumpConfig,
    fileConfig: Partial<BumpConfig>,
    options: BumpOptions,
  ): BumpConfig {
    // 深度合并配置对象
    const merged = this.deepMerge(defaultConfig, fileConfig)

    // 应用命令行选项覆盖
    if (
      options.dryRun !== undefined && // dryRun 选项影响多个配置
      options.dryRun
    ) {
      merged.commit = false
      merged.tag = false
      merged.push = false
      merged.publish = false
    }

    return merged
  }

  /**
   * 规范化配置
   */
  private async normalizeConfig(
    config: BumpConfig,
    _options: BumpOptions,
  ): Promise<ResolvedConfig> {
    // 解析钩子配置
    const resolvedHooks = this.resolveHooks(config.hooks)

    // 确定项目根目录
    const projectRoot = process.cwd()

    // 解析工作空间包
    const workspacePackages = await this.resolveWorkspacePackages(
      config.packages,
      projectRoot,
    )

    // 处理遗留配置
    const normalizedConfig = this.handleLegacyConfig(config)

    return {
      ...normalizedConfig,
      projectRoot,
      workspacePackages,
      resolvedHooks,
    }
  }

  /**
   * 解析钩子配置
   */
  private resolveHooks(hookConfig: BumpConfig['hooks']) {
    return {
      preVersion: this.normalizeHookArray(hookConfig.preVersion),
      postVersion: this.normalizeHookArray(hookConfig.postVersion),
      prePublish: this.normalizeHookArray(hookConfig.prePublish),
      postPublish: this.normalizeHookArray(hookConfig.postPublish),
    }
  }

  /**
   * 规范化钩子数组
   */
  private normalizeHookArray(hooks: (string | any)[]): any[] {
    return hooks.map((hook) => {
      if (typeof hook === 'string') {
        return {
          name: `command-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          execute: async () => {
            // 这里会执行命令
            console.info(`Executing hook: ${hook}`)
          },
        }
      }
      return hook
    })
  }

  /**
   * 解析工作空间包
   */
  private async resolveWorkspacePackages(
    packages: string[],
    projectRoot: string,
  ): Promise<string[]> {
    // 这里应该根据 glob 模式解析实际的包路径
    // 简化实现，直接返回配置的包路径
    return packages.map((pkg) => resolve(projectRoot, pkg))
  }

  /**
   * 处理遗留配置
   */
  private handleLegacyConfig(config: BumpConfig): BumpConfig {
    const normalized = { ...config }

    // 处理遗留的钩子配置
    const hooks = { ...normalized.hooks }
    const legacyConfig = config as any

    // 支持旧的 leading/before 配置
    if (legacyConfig.leading || legacyConfig.before) {
      const legacyHooks = this.wrapHookArray(
        legacyConfig.leading || legacyConfig.before || [],
      )
      hooks.preVersion = [...hooks.preVersion, ...legacyHooks]
    }

    // 支持旧的 trailing/tailing/after 配置
    if (legacyConfig.trailing || legacyConfig.tailing || legacyConfig.after) {
      const legacyHooks = this.wrapHookArray(
        legacyConfig.trailing ||
          legacyConfig.tailing ||
          legacyConfig.after ||
          [],
      )
      hooks.postVersion = [...hooks.postVersion, ...legacyHooks]
    }

    // 支持旧的 finally 配置
    if (legacyConfig.finally) {
      const legacyHooks = this.wrapHookArray(legacyConfig.finally || [])
      hooks.postPublish = [...hooks.postPublish, ...legacyHooks]
    }

    normalized.hooks = hooks
    return normalized
  }

  /**
   * 包装钩子数组
   */
  private wrapHookArray(hook: any): string[] {
    if (typeof hook === 'string') {
      return [hook]
    }

    if (Array.isArray(hook)) {
      return hook
    }

    throw new TypeError(`Invalid hook type: ${typeof hook}`)
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(options: BumpOptions): string {
    return JSON.stringify({
      configPath: options.configPath,
      dryRun: options.dryRun,
      cwd: process.cwd(),
    })
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.configCache.clear()
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary(config: ResolvedConfig) {
    return {
      mode: config.mode,
      packagesCount: config.workspacePackages.length,
      allowedBranches: config.allowedBranches.length,
      hooksCount: {
        preVersion: config.resolvedHooks.preVersion.length,
        postVersion: config.resolvedHooks.postVersion.length,
        prePublish: config.resolvedHooks.prePublish.length,
        postPublish: config.resolvedHooks.postPublish.length,
      },
      features: {
        git: config.commit || config.tag || config.push,
        publish: config.publish,
        changelog: Boolean(config.changelog),
        withTags: config.withTags,
      },
    }
  }
}
