import { readFileSync } from 'node:fs'
import path from 'node:path/posix'
import type { IBumpService } from '../interfaces/services.js'
import type { BumpOptions, ReleaseType } from '../types/index.js'

import { GitPlugin } from '../plugins/builtin/GitPlugin.js'
import { BumpService } from '../services/BumpService.js'

/**
 * CLI 命令适配器
 *
 * 职责：
 * - 解析命令行参数
 * - 适配现有 CLI 接口
 * - 协调新架构执行
 */
export class BumpCommand {
  private bumpService: IBumpService

  constructor(bumpService?: IBumpService) {
    this.bumpService = bumpService || this.createDefaultBumpService()
  }

  /**
   * 执行版本升级命令
   */
  async execute(options: CLIOptions = {}): Promise<void> {
    try {
      // 转换 CLI 选项为内部选项
      const bumpOptions = this.convertCLIOptions(options)

      // 执行版本升级
      const result = await this.bumpService.execute(bumpOptions)

      // 显示结果
      this.displayResult(result, options)
    } catch (error) {
      this.displayError(error, options)
      process.exit(1)
    }
  }

  /**
   * 创建默认服务实例
   */
  private createDefaultBumpService(): IBumpService {
    const service = BumpService.createWithDefaults()

    // 注册内置插件
    const gitPlugin = new GitPlugin()
    service['pluginManager'].register(gitPlugin)

    return service
  }

  /**
   * 转换 CLI 选项为内部选项
   */
  private convertCLIOptions(cliOptions: CLIOptions): BumpOptions {
    const options: BumpOptions = {}

    // 版本相关选项
    if (cliOptions.version) options.targetVersion = cliOptions.version
    if (cliOptions.releaseType) options.releaseType = cliOptions.releaseType

    // 发布类型快捷方式
    if (cliOptions.patch) options.releaseType = 'patch'
    if (cliOptions.minor) options.releaseType = 'minor'
    if (cliOptions.major) options.releaseType = 'major'
    if (cliOptions.prepatch) options.releaseType = 'prepatch'
    if (cliOptions.preminor) options.releaseType = 'preminor'
    if (cliOptions.premajor) options.releaseType = 'premajor'
    if (cliOptions.prerelease) options.releaseType = 'prerelease'
    if (cliOptions.alpha) options.releaseType = 'prerelease'
    if (cliOptions.branch) options.releaseType = 'branch'

    // 控制选项
    if (cliOptions.dryRun !== undefined) options.dryRun = cliOptions.dryRun
    if (cliOptions.skipHooks !== undefined)
      options.skipHooks = cliOptions.skipHooks
    if (cliOptions.skipTests !== undefined)
      options.skipTests = cliOptions.skipTests
    if (cliOptions.skipPublish !== undefined)
      options.skipPublish = cliOptions.skipPublish
    if (cliOptions.force !== undefined) options.force = cliOptions.force

    // 过滤器和配置
    if (cliOptions.filter) options.filter = cliOptions.filter
    if (cliOptions.config) options.configPath = cliOptions.config

    return options
  }

  /**
   * 显示执行结果
   */
  private displayResult(result: any, options: CLIOptions): void {
    if (options.quiet) {
      // 静默模式只输出版本号
      console.info(result.newVersion)
      return
    }

    if (options.json) {
      // JSON 格式输出
      console.info(JSON.stringify(result, null, 2))
      return
    }

    // 标准输出格式
    console.info(
      `✅ Version bumped: ${result.previousVersion} → ${result.newVersion}`,
    )

    if (result.publishedPackages.length > 0) {
      console.info(
        `📦 Published packages: ${result.publishedPackages.join(', ')}`,
      )
    }

    if (result.createdTags.length > 0) {
      console.info(`🏷️  Created tags: ${result.createdTags.join(', ')}`)
    }

    console.info(`⏱️  Execution time: ${result.executionTime}ms`)

    if (options.verbose && result.errors && result.errors.length > 0) {
      console.info('⚠️  Warnings:')
      for (const error of result.errors) {
        console.info(`   - ${error.message}`)
      }
    }
  }

  /**
   * 显示错误信息
   */
  private displayError(error: any, options: CLIOptions): void {
    if (options.json) {
      console.error(
        JSON.stringify(
          {
            success: false,
            error: {
              message: error.message,
              code: error.code,
              context: error.context,
            },
          },
          null,
          2,
        ),
      )
      return
    }

    console.error('❌ Version bump failed')
    console.error(`Error: ${error.message}`)

    if (options.verbose && error.context) {
      console.error('Context:', error.context)
    }

    if (options.verbose && error.cause) {
      console.error('Cause:', error.cause.message)
    }
  }

  /**
   * 显示帮助信息
   */
  static showHelp(): void {
    console.info(`
Usage: bump [options] [release-type]

Release Types:
  patch        Increment patch version (1.0.0 → 1.0.1)
  minor        Increment minor version (1.0.0 → 1.1.0)
  major        Increment major version (1.0.0 → 2.0.0)
  prepatch     Increment patch version with prerelease (1.0.0 → 1.0.1-alpha.0)
  preminor     Increment minor version with prerelease (1.0.0 → 1.1.0-alpha.0)
  premajor     Increment major version with prerelease (1.0.0 → 2.0.0-alpha.0)
  prerelease   Increment prerelease version (1.0.0-alpha.0 → 1.0.0-alpha.1)
  alpha        Alias for prerelease
  branch       Create branch version (1.0.0 → 1.0.1-branch.abc123)

Options:
  --version <version>    Set specific version
  --dry-run             Show what would be done without making changes
  --skip-hooks          Skip execution of hooks
  --skip-tests          Skip running tests
  --skip-publish        Skip publishing to registry
  --force               Force version bump even if validation fails
  --filter <pattern>    Filter packages in monorepo mode
  --config <path>       Path to configuration file
  --quiet               Minimal output
  --json                Output in JSON format
  --verbose             Verbose output
  --help                Show this help message

Examples:
  bump patch                    # Increment patch version
  bump --version 2.0.0         # Set specific version
  bump minor --dry-run         # Preview minor version bump
  bump --config custom.config.js  # Use custom configuration
`)
  }

  /**
   * 显示版本信息
   */
  static async showVersion(): Promise<void> {
    try {
      const packageJsonPath = path.resolve(process.cwd(), 'package.json')
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

      console.info(packageJson.version)
    } catch {
      console.error('Failed to read version from package.json')
      process.exit(1)
    }
  }
}

/**
 * CLI 选项接口
 */
export interface CLIOptions {
  // 版本选项
  version?: string
  releaseType?: ReleaseType

  // 发布类型快捷方式
  patch?: boolean
  minor?: boolean
  major?: boolean
  prepatch?: boolean
  preminor?: boolean
  premajor?: boolean
  prerelease?: boolean
  alpha?: boolean
  branch?: boolean

  // 控制选项
  dryRun?: boolean
  skipHooks?: boolean
  skipTests?: boolean
  skipPublish?: boolean
  force?: boolean

  // 配置选项
  filter?: string
  config?: string

  // 输出选项
  quiet?: boolean
  json?: boolean
  verbose?: boolean
  help?: boolean
}
