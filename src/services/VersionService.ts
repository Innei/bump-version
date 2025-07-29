import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'
import type { ReleaseType as SemverReleaseType } from 'semver'
import type { IVersionService } from '../interfaces/services.js'
import type {
  CustomReleaseType,
  ReleaseType,
  StrictReleaseType,
} from '../types/index.js'

/**
 * 版本管理服务
 *
 * 职责：
 * - 读取和更新包版本
 * - 计算下一个版本号
 * - 验证版本格式
 * - 处理预发布标识符
 */
export class VersionService implements IVersionService {
  /**
   * 获取指定包的当前版本
   */
  async getCurrentVersion(packagePath: string): Promise<string> {
    try {
      const packageJsonPath = join(packagePath, 'package.json')
      const packageContent = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      if (!packageJson.version) {
        throw new Error(`No version field found in ${packageJsonPath}`)
      }

      if (!this.validateVersion(packageJson.version)) {
        throw new Error(`Invalid version format: ${packageJson.version}`)
      }

      return packageJson.version
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(
          `Failed to read version from ${packagePath}: ${error.message}`,
        )
      }
      throw new Error(
        `Failed to read version from ${packagePath}: ${String(error)}`,
      )
    }
  }

  /**
   * 基于发布类型计算目标版本
   */
  resolveTargetVersion(
    currentVersion: string,
    releaseType: ReleaseType,
    preId?: string,
  ): string {
    // 处理自定义发布类型
    if (this.isCustomReleaseType(releaseType)) {
      return this.handleCustomReleaseType(currentVersion, releaseType, preId)
    }

    // 处理标准 semver 发布类型
    return this.handleStandardReleaseType(
      currentVersion,
      releaseType as StrictReleaseType,
      preId,
    )
  }

  /**
   * 处理标准 semver 发布类型
   */
  private handleStandardReleaseType(
    currentVersion: string,
    releaseType: StrictReleaseType,
    preId?: string,
  ): string {
    if (!this.validateVersion(currentVersion)) {
      throw new Error(`Invalid current version: ${currentVersion}`)
    }

    try {
      // 获取当前版本的预发布标识符
      const currentPreId = this.getPreReleaseIdentifier(currentVersion)
      const identifier =
        preId ||
        currentPreId ||
        (releaseType.startsWith('pre') ? 'alpha' : undefined)

      const nextVersion = semver.inc(currentVersion, releaseType, identifier)

      if (!nextVersion) {
        throw new Error(
          `Failed to increment version ${currentVersion} with release type ${releaseType}`,
        )
      }

      return nextVersion
    } catch (error) {
      throw new Error(
        `Failed to resolve target version: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  /**
   * 处理自定义发布类型
   */
  private handleCustomReleaseType(
    currentVersion: string,
    releaseType: CustomReleaseType,
    preId?: string,
  ): string {
    switch (releaseType) {
      case 'branch': {
        // 分支版本需要特殊处理，这里返回一个预发布版本
        return this.handleStandardReleaseType(
          currentVersion,
          'prepatch',
          preId || 'branch',
        )
      }
      case 'custom': {
        // 自定义版本需要外部指定，返回当前版本
        return currentVersion
      }
      default: {
        throw new Error(`Unsupported custom release type: ${releaseType}`)
      }
    }
  }

  /**
   * 检查是否为自定义发布类型
   */
  private isCustomReleaseType(
    releaseType: ReleaseType,
  ): releaseType is CustomReleaseType {
    return releaseType === 'branch' || releaseType === 'custom'
  }

  /**
   * 验证版本格式
   */
  validateVersion(version: string): boolean {
    return semver.valid(version) !== null
  }

  /**
   * 更新包的版本号
   */
  async updatePackageVersion(
    packagePath: string,
    version: string,
  ): Promise<void> {
    if (!this.validateVersion(version)) {
      throw new Error(`Invalid version format: ${version}`)
    }

    try {
      const packageJsonPath = join(packagePath, 'package.json')
      const originalContent = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(originalContent)

      // 更新版本
      packageJson.version = version

      // 保持原有的格式和缩进
      const indent = this.detectIndentation(originalContent)
      const updatedContent = `${JSON.stringify(packageJson, null, indent)}\n`

      writeFileSync(packageJsonPath, updatedContent, 'utf-8')
    } catch (error) {
      throw new Error(
        `Failed to update version in ${packagePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  /**
   * 基于 Git 标签计算下一版本
   */
  resolveTargetVersionWithTags(
    currentVersion: string,
    releaseType: ReleaseType,
    tags: string[],
    preId?: string,
  ): string {
    if (!this.validateVersion(currentVersion)) {
      throw new Error(`Invalid current version: ${currentVersion}`)
    }

    // 对于自定义类型，使用标准方法
    if (this.isCustomReleaseType(releaseType)) {
      return this.handleCustomReleaseType(currentVersion, releaseType, preId)
    }

    // 对于标准类型，使用标签计算
    return this.resolveTargetVersionWithTagsInternal(
      currentVersion,
      releaseType as StrictReleaseType,
      tags,
      preId,
    )
  }

  /**
   * 内部标签计算方法
   */
  private resolveTargetVersionWithTagsInternal(
    currentVersion: string,
    releaseType: StrictReleaseType,
    tags: string[],
    preId?: string,
  ): string {
    if (!this.validateVersion(currentVersion)) {
      throw new Error(`Invalid current version: ${currentVersion}`)
    }

    // 过滤和排序有效的语义版本标签
    const validTags = tags
      .filter((tag) => this.validateVersion(tag))
      .sort(semver.compare)
      .reverse() // 最新的在前

    if (validTags.length === 0) {
      return this.resolveTargetVersion(currentVersion, releaseType, preId)
    }

    const currentPreId = this.getPreReleaseIdentifier(currentVersion)
    const identifier = preId || currentPreId || 'alpha'

    try {
      const result = this.calculateVersionWithTags(
        currentVersion,
        releaseType,
        validTags,
        identifier,
      )

      return (
        result || this.resolveTargetVersion(currentVersion, releaseType, preId)
      )
    } catch (error) {
      throw new Error(
        `Failed to resolve version with tags: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  /**
   * 比较两个版本
   */
  compareVersions(versionA: string, versionB: string): number {
    if (!this.validateVersion(versionA) || !this.validateVersion(versionB)) {
      throw new Error('Invalid version format for comparison')
    }

    return semver.compare(versionA, versionB)
  }

  /**
   * 检查版本是否为预发布版本
   */
  isPreRelease(version: string): boolean {
    if (!this.validateVersion(version)) {
      return false
    }

    return semver.prerelease(version) !== null
  }

  /**
   * 获取版本的主要组件
   */
  getVersionComponents(version: string) {
    if (!this.validateVersion(version)) {
      throw new Error(`Invalid version: ${version}`)
    }

    return {
      major: semver.major(version),
      minor: semver.minor(version),
      patch: semver.patch(version),
      prerelease: semver.prerelease(version),
      raw: version,
    }
  }

  /**
   * 获取预发布标识符
   */
  private getPreReleaseIdentifier(version: string): string | undefined {
    const prerelease = semver.prerelease(version)
    if (!prerelease || prerelease.length === 0) {
      return undefined
    }

    // 第一个元素通常是标识符 (alpha, beta, rc, etc.)
    return String(prerelease[0])
  }

  /**
   * 检测 JSON 文件的缩进格式
   */
  private detectIndentation(content: string): string | number {
    // 尝试检测现有的缩进
    const match = content.match(/^(\s+)/m)
    if (match) {
      const indent = match[1]
      // 如果是空格，返回空格数量；如果是制表符，返回制表符
      return indent.includes('\t') ? '\t' : indent.length
    }

    // 默认使用 2 个空格
    return 2
  }

  /**
   * 基于标签计算版本
   */
  private calculateVersionWithTags(
    currentVersion: string,
    releaseType: StrictReleaseType,
    tags: string[],
    identifier: string,
  ): string | null {
    const currentPreId = this.getPreReleaseIdentifier(currentVersion)

    // 处理预发布情况
    if (currentPreId && releaseType === 'prerelease') {
      return this.findNextPreRelease(currentVersion, tags, currentPreId)
    }

    // 处理其他发布类型
    switch (releaseType) {
      case 'major':
      case 'premajor': {
        return this.findNextMajorVersion(tags, releaseType, identifier)
      }

      case 'minor':
      case 'preminor': {
        return this.findNextMinorVersion(
          currentVersion,
          tags,
          releaseType,
          identifier,
        )
      }

      case 'patch':
      case 'prepatch': {
        return this.findNextPatchVersion(
          currentVersion,
          tags,
          releaseType,
          identifier,
        )
      }

      case 'prerelease': {
        return this.findNextGeneralPreRelease(currentVersion, tags, identifier)
      }

      default: {
        return null
      }
    }
  }

  private findNextPreRelease(
    currentVersion: string,
    tags: string[],
    identifier: string,
  ): string | null {
    const { major, minor, patch } = this.getVersionComponents(currentVersion)

    // 查找相同 major.minor.patch 和相同标识符的最新版本
    const sameBaseVersions = tags.filter((tag) => {
      const components = this.getVersionComponents(tag)
      return (
        components.major === major &&
        components.minor === minor &&
        components.patch === patch &&
        this.getPreReleaseIdentifier(tag) === identifier
      )
    })

    if (sameBaseVersions.length === 0) {
      return null
    }

    const latest = sameBaseVersions.sort(semver.compare).pop()!
    return semver.inc(latest, 'prerelease', identifier)
  }

  private findNextMajorVersion(
    tags: string[],
    releaseType: StrictReleaseType,
    identifier: string,
  ): string | null {
    if (tags.length === 0) {
      return null
    }

    const latestTag = tags[0] // tags 已经按降序排序
    return semver.inc(latestTag, releaseType, identifier)
  }

  private findNextMinorVersion(
    currentVersion: string,
    tags: string[],
    releaseType: StrictReleaseType,
    identifier: string,
  ): string | null {
    const { major } = this.getVersionComponents(currentVersion)

    // 查找相同主版本的最新版本
    const sameMajorVersions = tags.filter((tag) => {
      return this.getVersionComponents(tag).major === major
    })

    if (sameMajorVersions.length === 0) {
      return null
    }

    const latest = sameMajorVersions[0] // 已排序，第一个是最新的
    return semver.inc(latest, releaseType, identifier)
  }

  private findNextPatchVersion(
    currentVersion: string,
    tags: string[],
    releaseType: StrictReleaseType,
    identifier: string,
  ): string | null {
    const { major, minor } = this.getVersionComponents(currentVersion)

    // 查找相同主版本和次版本的最新版本
    const sameMinorVersions = tags.filter((tag) => {
      const components = this.getVersionComponents(tag)
      return components.major === major && components.minor === minor
    })

    if (sameMinorVersions.length === 0) {
      return null
    }

    const latest = sameMinorVersions[0] // 已排序，第一个是最新的
    return semver.inc(latest, releaseType, identifier)
  }

  private findNextGeneralPreRelease(
    currentVersion: string,
    tags: string[],
    identifier: string,
  ): string | null {
    const { major, minor } = this.getVersionComponents(currentVersion)

    // 查找相同主版本和次版本的最新版本
    const sameMinorVersions = tags.filter((tag) => {
      const components = this.getVersionComponents(tag)
      return components.major === major && components.minor === minor
    })

    if (sameMinorVersions.length === 0) {
      return null
    }

    const latest = sameMinorVersions[0]
    return semver.inc(latest, 'prepatch', identifier)
  }
}
