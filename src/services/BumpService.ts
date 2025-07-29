import { existsSync } from 'node:fs'
import type {
  IBumpService,
  IConfigService,
  IExecutionContext,
  IGitService,
  IPackageService,
  IVersionService,
} from '../interfaces/services.js'
import type {
  BumpError,
  BumpOptions,
  BumpResult,
  ExecutionState,
} from '../types/index.js'

import { ExecutionContext } from '../core/ExecutionContext.js'
import { PluginManager } from '../plugins/PluginManager.js'
import { ConfigService } from './ConfigService.js'
import { GitService } from './GitService.js'
import { PackageService } from './PackageService.js'
import { VersionService } from './VersionService.js'

/**
 * 版本升级服务主要实现
 */
export class BumpService implements IBumpService {
  constructor(
    private versionService: IVersionService,
    private configService: IConfigService,
    private gitService: IGitService,
    private packageService: IPackageService,
    private pluginManager: PluginManager,
  ) {}

  /**
   * 创建默认服务实例的静态方法
   */
  static createWithDefaults(): BumpService {
    const versionService = new VersionService()
    const configService = new ConfigService()
    const gitService = new GitService()
    const packageService = new PackageService()
    const pluginManager = new PluginManager()

    return new BumpService(
      versionService,
      configService,
      gitService,
      packageService,
      pluginManager,
    )
  }

  async execute(options: BumpOptions): Promise<BumpResult> {
    const startTime = Date.now()
    let context: IExecutionContext | undefined

    try {
      await this.validateOptions(options)
      context = await this.createExecutionContext(options)
      await this.pluginManager.initializePlugins(context)

      const result = await this.executeMainFlow(context)
      result.executionTime = Date.now() - startTime

      return result
    } catch (error) {
      if (context) {
        await this.handleExecutionError(error, context)
      }

      throw this.createBumpError(
        'EXECUTION_FAILED',
        'Bump execution failed',
        error,
        {
          options,
          executionTime: Date.now() - startTime,
        },
      )
    } finally {
      if (context) {
        await this.cleanup(context)
      }
    }
  }

  async validateOptions(options: BumpOptions): Promise<void> {
    const errors: string[] = []

    if (options.releaseType && !this.isValidReleaseType(options.releaseType)) {
      errors.push(`Invalid release type: ${options.releaseType}`)
    }

    if (
      options.targetVersion &&
      !this.versionService.validateVersion(options.targetVersion)
    ) {
      errors.push(`Invalid target version: ${options.targetVersion}`)
    }

    if (options.configPath && !existsSync(options.configPath)) {
      errors.push(`Config file not found: ${options.configPath}`)
    }

    if (errors.length > 0) {
      throw this.createBumpError(
        'INVALID_OPTIONS',
        'Invalid options provided',
        null,
        {
          errors,
          options,
        },
      )
    }
  }

  async createExecutionContext(
    options: BumpOptions,
  ): Promise<IExecutionContext> {
    try {
      const config = await this.configService.resolveConfig(options)
      const packageInfo = await this.packageService.getPackageInfo(
        process.cwd(),
      )
      const gitInfo = await this.gitService.getInfo()

      const context = new ExecutionContext(
        options,
        config,
        packageInfo,
        gitInfo,
      )
      this.setupContextEventListeners(context)

      return context
    } catch (error) {
      throw this.createBumpError(
        'CONTEXT_CREATION_FAILED',
        'Failed to create execution context',
        error,
      )
    }
  }

  private async executeMainFlow(
    context: IExecutionContext,
  ): Promise<BumpResult> {
    await this.executePhase(context, 'validating', async () => {
      await this.validatePreConditions(context)
    })

    await this.executePhase(context, 'resolving-version', async () => {
      await this.resolveTargetVersion(context)
    })

    await this.executePhase(context, 'pre-hooks', async () => {
      await this.pluginManager.executeHooks('preVersion', context)
    })

    await this.executePhase(context, 'updating-version', async () => {
      await this.performVersionUpdate(context)
    })

    await this.executePhase(context, 'post-hooks', async () => {
      await this.pluginManager.executeHooks('postVersion', context)
    })

    if (context.config.publish && !context.options.skipPublish) {
      await this.executePhase(context, 'publishing', async () => {
        await this.pluginManager.executeHooks('prePublish', context)
        await this.performPublish(context)
        await this.pluginManager.executeHooks('postPublish', context)
      })
    }

    context.setState({ phase: 'completed' })
    return this.createSuccessResult(context)
  }

  private async executePhase(
    context: IExecutionContext,
    phase: ExecutionState['phase'],
    executor: () => Promise<void>,
  ): Promise<void> {
    try {
      context.setState({ phase })
      context.emit('phase:start', { phase })

      await executor()

      context.emit('phase:complete', { phase })
    } catch (error) {
      context.emit('phase:error', { phase, error })
      throw error
    }
  }

  private async validatePreConditions(
    context: IExecutionContext,
  ): Promise<void> {
    if (!context.config.allowDirty && !(await this.gitService.isClean())) {
      throw this.createBumpError(
        'GIT_NOT_CLEAN',
        'Git working directory is not clean',
      )
    }

    await this.validateBranchPermissions(context)
    await this.packageService.validatePackage(context.packageInfo.path)
  }

  private async validateBranchPermissions(
    context: IExecutionContext,
  ): Promise<void> {
    const { currentBranch } = context.gitInfo
    const { allowedBranches } = context.config

    if (!allowedBranches || allowedBranches.length === 0) {
      return
    }

    const isAllowed = allowedBranches.some((branch) => {
      if (typeof branch === 'string') {
        return new RegExp(branch).test(currentBranch)
      }

      const matches = new RegExp(branch.name).test(currentBranch)
      if (!matches) return false

      if (context.options.releaseType) {
        if (branch.disallowTypes?.includes(context.options.releaseType)) {
          return false
        }
        if (
          branch.allowTypes &&
          !branch.allowTypes.includes(context.options.releaseType)
        ) {
          return false
        }
      }

      return true
    })

    if (!isAllowed) {
      throw this.createBumpError(
        'BRANCH_NOT_ALLOWED',
        `Branch '${currentBranch}' is not allowed for version bump`,
        null,
        {
          currentBranch,
          allowedBranches,
          releaseType: context.options.releaseType,
        },
      )
    }
  }

  private async resolveTargetVersion(
    context: IExecutionContext,
  ): Promise<void> {
    let targetVersion: string

    if (context.options.targetVersion) {
      targetVersion = context.options.targetVersion
    } else if (context.options.releaseType) {
      targetVersion = this.versionService.resolveTargetVersion(
        context.packageInfo.version,
        context.options.releaseType,
      )
    } else {
      throw this.createBumpError(
        'NO_VERSION_SPECIFIED',
        'No target version or release type specified',
      )
    }

    if (!this.versionService.validateVersion(targetVersion)) {
      throw this.createBumpError(
        'INVALID_TARGET_VERSION',
        `Invalid target version: ${targetVersion}`,
      )
    }

    context.setTargetVersion(targetVersion)
  }

  private async performVersionUpdate(
    context: IExecutionContext,
  ): Promise<void> {
    const targetVersion = context.getTargetVersion()
    if (!targetVersion) {
      throw this.createBumpError('NO_TARGET_VERSION', 'No target version set')
    }

    await this.versionService.updatePackageVersion(
      context.packageInfo.path,
      targetVersion,
    )

    const state = context.getState()
    state.modifiedFiles.push('package.json')
    context.setState(state)

    context.addRollbackAction({
      description: 'Restore package.json version',
      execute: async () => {
        await this.versionService.updatePackageVersion(
          context.packageInfo.path,
          context.packageInfo.version,
        )
      },
    })
  }

  private async performPublish(context: IExecutionContext): Promise<void> {
    try {
      await this.packageService.publish(context.packageInfo.path, {
        registry: context.config.publishRegistry,
        access: context.config.publishAccess,
        dryRun: context.options.dryRun,
      })

      const state = context.getState()
      state.publishedPackages.push(context.packageInfo.name)
      context.setState(state)
    } catch (error) {
      throw this.createBumpError(
        'PUBLISH_FAILED',
        'Package publish failed',
        error,
        {
          package: context.packageInfo.name,
          version: context.getTargetVersion(),
        },
      )
    }
  }

  private async handleExecutionError(
    error: any,
    context: IExecutionContext,
  ): Promise<void> {
    try {
      context.setState({ phase: 'error' })
      context.emit('error', error)
      await context.executeRollback()
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
    }
  }

  private async cleanup(context: IExecutionContext): Promise<void> {
    try {
      await this.pluginManager.destroyPlugins()
      context.emit('cleanup')
    } catch (error) {
      console.error('Cleanup failed:', error)
    }
  }

  private createSuccessResult(context: IExecutionContext): BumpResult {
    const state = context.getState()

    return {
      success: true,
      previousVersion: context.packageInfo.version,
      newVersion: context.getTargetVersion()!,
      releaseType: context.options.releaseType!,
      publishedPackages: state.publishedPackages,
      createdTags: state.createdTags,
      executionTime: 0,
    }
  }

  private createBumpError(
    code: string,
    message: string,
    cause?: any,
    context?: Record<string, any>,
  ): BumpError {
    return {
      code,
      message,
      cause: cause instanceof Error ? cause : new Error(String(cause)),
      context,
    }
  }

  private setupContextEventListeners(context: IExecutionContext): void {
    context.on('phase:start', (data) => {
      console.info(`Starting phase: ${data.data.phase}`)
    })

    context.on('phase:complete', (data) => {
      console.info(`Completed phase: ${data.data.phase}`)
    })

    context.on('phase:error', (data) => {
      console.error(`Error in phase ${data.data.phase}:`, data.data.error)
    })
  }

  private isValidReleaseType(type: string): boolean {
    const validTypes = [
      'patch',
      'minor',
      'major',
      'prepatch',
      'preminor',
      'premajor',
      'prerelease',
      'branch',
      'custom',
    ]
    return validTypes.includes(type)
  }
}
