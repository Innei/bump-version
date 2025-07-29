import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { $ } from 'zx'
import type { IPackageService, PublishOptions } from '../interfaces/services.js'
import type { PackageInfo } from '../types/index.js'

/**
 * 包管理服务
 *
 * 职责：
 * - 读取和验证包信息
 * - 处理工作空间包
 * - 执行包发布
 * - 依赖关系分析
 */
export class PackageService implements IPackageService {
  /**
   * 获取包信息
   */
  async getPackageInfo(path: string): Promise<PackageInfo> {
    try {
      const packageJsonPath = join(path, 'package.json')

      if (!existsSync(packageJsonPath)) {
        throw new Error('package.json not found')
      }

      const packageContent = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      if (!packageJson.name) {
        throw new Error('package.json is missing name field')
      }

      if (!packageJson.version) {
        throw new Error('package.json is missing version field')
      }

      return {
        name: packageJson.name,
        version: packageJson.version,
        path,
        packageJson,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
      }
    } catch (error) {
      throw new Error(
        `Failed to get package info from ${path}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取工作空间包列表
   */
  async getWorkspacePackages(): Promise<PackageInfo[]> {
    try {
      // 尝试使用 npm/pnpm/yarn 的工作空间功能
      const packageManager = await this.detectPackageManager()

      let workspacePaths: string[] = []

      switch (packageManager) {
        case 'pnpm': {
          workspacePaths = await this.getPnpmWorkspaces()
          break
        }
        case 'yarn': {
          workspacePaths = await this.getYarnWorkspaces()
          break
        }
        case 'npm': {
          workspacePaths = await this.getNpmWorkspaces()
          break
        }
        default: {
          // 如果无法检测包管理器，返回根包
          workspacePaths = [process.cwd()]
        }
      }

      const packages: PackageInfo[] = []

      for (const packagePath of workspacePaths) {
        try {
          const packageInfo = await this.getPackageInfo(packagePath)
          packages.push(packageInfo)
        } catch (error) {
          console.warn(
            `Warning: Failed to load package from ${packagePath}:`,
            error,
          )
        }
      }

      return packages
    } catch (error) {
      throw new Error(
        `Failed to get workspace packages: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 发布包
   */
  async publish(
    packagePath: string,
    options: PublishOptions = {},
  ): Promise<void> {
    try {
      const packageManager = await this.detectPackageManager()

      let publishCommand = this.buildPublishCommand(packageManager, options)

      if (options.dryRun) {
        publishCommand += ' --dry-run'
      }

      // 切换到包目录执行发布
      const originalCwd = process.cwd()

      try {
        process.chdir(packagePath)
        await $`${publishCommand}`.quiet()
      } finally {
        process.chdir(originalCwd)
      }
    } catch (error) {
      throw new Error(
        `Failed to publish package at ${packagePath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 验证包
   */
  async validatePackage(packagePath: string): Promise<void> {
    try {
      const packageInfo = await this.getPackageInfo(packagePath)

      // 检查必要字段
      if (!packageInfo.name) {
        throw new Error('Package name is required')
      }

      if (!packageInfo.version) {
        throw new Error('Package version is required')
      }

      // 检查版本格式
      if (!/^\d+\.\d+\.\d+/.test(packageInfo.version)) {
        throw new Error(`Invalid version format: ${packageInfo.version}`)
      }

      // 检查是否存在必要文件
      const essentialFiles = ['package.json']

      for (const file of essentialFiles) {
        const filePath = join(packagePath, file)
        if (!existsSync(filePath)) {
          throw new Error(`Missing essential file: ${file}`)
        }
      }

      // 如果包含 build 脚本，检查 dist 目录是否存在
      if (packageInfo.packageJson.scripts?.build) {
        const distPath = join(packagePath, 'dist')
        if (!existsSync(distPath)) {
          console.warn(
            `Warning: Package has build script but no dist directory found`,
          )
        }
      }
    } catch (error) {
      throw new Error(
        `Package validation failed for ${packagePath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 检测包管理器
   */
  async detectPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
    try {
      // 检查锁文件
      if (existsSync('pnpm-lock.yaml')) {
        return 'pnpm'
      }

      if (existsSync('yarn.lock')) {
        return 'yarn'
      }

      if (existsSync('package-lock.json')) {
        return 'npm'
      }

      // 检查环境变量
      if (process.env.npm_config_user_agent) {
        const userAgent = process.env.npm_config_user_agent
        if (userAgent.includes('pnpm')) return 'pnpm'
        if (userAgent.includes('yarn')) return 'yarn'
        if (userAgent.includes('npm')) return 'npm'
      }

      // 默认返回 npm
      return 'npm'
    } catch {
      return 'npm'
    }
  }

  /**
   * 检查包是否已发布
   */
  async isPackagePublished(
    name: string,
    version: string,
    registry?: string,
  ): Promise<boolean> {
    try {
      const registryArg = registry ? `--registry ${registry}` : ''
      await $`npm view ${name}@${version} ${registryArg}`.quiet()
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取包的最新版本
   */
  async getLatestVersion(
    name: string,
    registry?: string,
  ): Promise<string | null> {
    try {
      const registryArg = registry ? `--registry ${registry}` : ''
      const result = await $`npm view ${name} version ${registryArg}`.quiet()
      return result.stdout.trim() || null
    } catch {
      return null
    }
  }

  // 私有方法

  /**
   * 获取 pnpm 工作空间
   */
  private async getPnpmWorkspaces(): Promise<string[]> {
    try {
      const result = await $`pnpm list -r --depth 0 --json`.quiet()
      const packages = JSON.parse(result.stdout)
      return packages.map((pkg: any) => pkg.path || process.cwd())
    } catch {
      return [process.cwd()]
    }
  }

  /**
   * 获取 yarn 工作空间
   */
  private async getYarnWorkspaces(): Promise<string[]> {
    try {
      const result = await $`yarn workspaces list --json`.quiet()
      const lines = result.stdout.trim().split('\n')
      const workspaces = lines.map((line) => JSON.parse(line))
      return workspaces.map((ws: any) => join(process.cwd(), ws.location))
    } catch {
      return [process.cwd()]
    }
  }

  /**
   * 获取 npm 工作空间
   */
  private async getNpmWorkspaces(): Promise<string[]> {
    try {
      const result = await $`npm ls --workspaces --json`.quiet()
      const data = JSON.parse(result.stdout)

      if (data.workspaces) {
        return Object.keys(data.workspaces).map((ws) => join(process.cwd(), ws))
      }

      return [process.cwd()]
    } catch {
      return [process.cwd()]
    }
  }

  /**
   * 构建发布命令
   */
  private buildPublishCommand(
    packageManager: string,
    options: PublishOptions,
  ): string {
    let command = `${packageManager} publish`

    if (options.access) {
      command += ` --access ${options.access}`
    }

    if (options.registry) {
      command += ` --registry ${options.registry}`
    }

    if (options.tag) {
      command += ` --tag ${options.tag}`
    }

    return command
  }

  /**
   * 分析包依赖关系
   */
  async analyzeDependencies(packagePath: string): Promise<{
    internal: string[]
    external: string[]
    circular: string[]
  }> {
    try {
      const packageInfo = await this.getPackageInfo(packagePath)
      const allDeps = [
        ...packageInfo.dependencies,
        ...packageInfo.devDependencies,
      ]

      // 简化实现，更完整的实现需要遍历依赖树
      return {
        internal: [], // 内部工作空间依赖
        external: allDeps, // 外部依赖
        circular: [], // 循环依赖
      }
    } catch (error) {
      throw new Error(
        `Failed to analyze dependencies: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取包的发布信息
   */
  async getPublishInfo(packagePath: string): Promise<{
    name: string
    version: string
    isPrivate: boolean
    publishConfig: any
  }> {
    try {
      const packageInfo = await this.getPackageInfo(packagePath)

      return {
        name: packageInfo.name,
        version: packageInfo.version,
        isPrivate: packageInfo.packageJson.private === true,
        publishConfig: packageInfo.packageJson.publishConfig || {},
      }
    } catch (error) {
      throw new Error(
        `Failed to get publish info: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
