import semver from 'semver'
import { $ } from 'zx'
import type { IGitService } from '../interfaces/services.js'
import type { GitInfo } from '../types/index.js'

/**
 * Git 操作服务
 *
 * 职责：
 * - Git 状态检查
 * - 分支和标签操作
 * - 提交和推送
 * - Git 信息获取
 */
export class GitService implements IGitService {
  /**
   * 获取 Git 信息
   */
  async getInfo(): Promise<GitInfo> {
    try {
      const [
        currentBranch,
        latestTag,
        hasUncommittedChanges,
        remoteUrl,
        commitsSinceLastTag,
      ] = await Promise.all([
        this.getCurrentBranch(),
        this.getLatestTag().catch(() => null),
        this.hasUncommittedChanges(),
        this.getRemoteUrl().catch(() => null),
        this.getCommitsSinceLastTag().catch(() => 0),
      ])

      return {
        currentBranch,
        latestTag,
        hasUncommittedChanges,
        remoteUrl,
        commitsSinceLastTag,
      }
    } catch (error) {
      throw new Error(
        `Failed to get git info: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 检查工作目录是否干净
   */
  async isClean(): Promise<boolean> {
    try {
      const result = await $`git status --porcelain`.quiet()
      return !result.stdout.trim()
    } catch (error) {
      throw new Error(
        `Failed to check git status: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 创建标签
   */
  async createTag(tag: string, message: string): Promise<void> {
    try {
      await $`git tag -a ${tag} -m ${message}`
    } catch (error) {
      throw new Error(
        `Failed to create tag ${tag}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 推送到远程
   */
  async push(withTags = false): Promise<void> {
    try {
      if (withTags) {
        await Promise.all([$`git push`, $`git push --tags`])
      } else {
        await $`git push`
      }
    } catch (error) {
      throw new Error(
        `Failed to push: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 提交更改
   */
  async commit(message: string, files: string[]): Promise<void> {
    try {
      // 添加文件到暂存区
      if (files.length > 0) {
        await $`git add ${files}`
      }

      // 提交更改
      await $`git commit -m ${message} --no-verify`
    } catch (error) {
      throw new Error(
        `Failed to commit: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取最新标签
   */
  async getLatestTag(): Promise<string | null> {
    try {
      const result = await $`git describe --tags --abbrev=0`.quiet()
      const tag = result.stdout.trim()
      return tag || null
    } catch {
      // 如果没有标签，返回 null
      return null
    }
  }

  /**
   * 获取自指定标签以来的提交数
   */
  async getCommitsSinceTag(tag: string): Promise<number> {
    try {
      const result = await $`git rev-list ${tag}..HEAD --count`.quiet()
      return Number.parseInt(result.stdout.trim(), 10) || 0
    } catch {
      return 0
    }
  }

  /**
   * 获取当前分支名
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const result = await $`git branch --show-current`.quiet()
      const branch = result.stdout.trim()

      if (!branch) {
        throw new Error('Unable to determine current branch')
      }

      return branch
    } catch (error) {
      throw new Error(
        `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 检查是否在主分支
   */
  async isMainBranch(): Promise<boolean> {
    try {
      const currentBranch = await this.getCurrentBranch()
      return ['main', 'master'].includes(currentBranch)
    } catch {
      return false
    }
  }

  /**
   * 获取分支版本（用于分支发布）
   */
  async getBranchVersion(
    currentVersion: string,
  ): Promise<{ branchVersion: string; slugifyTagName: string }> {
    try {
      const branchName = await this.getCurrentBranch()
      const hash = await this.getShortHash()

      // 将分支名转换为适合标签的格式
      const slugifyTagName = this.slugifyBranchName(branchName)

      // 生成分支版本
      const nextPatchVersion = semver.inc(currentVersion, 'patch')
      const branchVersion = `${nextPatchVersion}-${slugifyTagName}.${hash}`

      return { branchVersion, slugifyTagName }
    } catch (error) {
      throw new Error(
        `Failed to get branch version: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取语义版本标签
   */
  async getSemVerTags(tagPrefix = ''): Promise<string[]> {
    try {
      const result = await $`git tag -l`.quiet()
      const allTags = result.stdout.trim().split('\n').filter(Boolean)

      return allTags
        .filter((tag) => {
          // 移除标签前缀
          const versionPart = tagPrefix
            ? tag.replace(new RegExp(`^${tagPrefix}`), '')
            : tag
          return semver.valid(versionPart)
        })
        .map((tag) =>
          tagPrefix ? tag.replace(new RegExp(`^${tagPrefix}`), '') : tag,
        )
        .filter(Boolean)
    } catch (error) {
      throw new Error(
        `Failed to get semver tags: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取远程标签
   */
  async fetchRemoteTags(): Promise<void> {
    try {
      await $`git fetch --tags`.quiet()
    } catch (error) {
      throw new Error(
        `Failed to fetch remote tags: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 检查标签前是否有提交
   */
  async hasCommitsSinceTag(tag: string): Promise<boolean> {
    try {
      const count = await this.getCommitsSinceTag(tag)
      return count > 0
    } catch {
      return true // 如果检查失败，假设有提交
    }
  }

  /**
   * 推送到上游
   */
  async pushWithUpstream(): Promise<void> {
    try {
      const currentBranch = await this.getCurrentBranch()

      try {
        // 尝试直接推送
        await $`git push`.quiet()
      } catch {
        // 如果推送失败，尝试设置上游并推送
        await $`git push --set-upstream origin ${currentBranch}`.quiet()
      }
    } catch (error) {
      throw new Error(
        `Failed to push with upstream: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 删除标签
   */
  async deleteTag(tag: string, remote = false): Promise<void> {
    try {
      // 删除本地标签
      await $`git tag -d ${tag}`.quiet().nothrow()

      // 删除远程标签
      if (remote) {
        await $`git push origin :refs/tags/${tag}`.quiet().nothrow()
      }
    } catch (error) {
      throw new Error(
        `Failed to delete tag ${tag}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 执行 Git 命令
   */
  async executeCommand(command: string): Promise<string> {
    try {
      const result = await $`git ${command}`.quiet()
      return result.stdout.trim()
    } catch (error) {
      throw new Error(
        `Git command failed: ${command}. ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  // 私有辅助方法

  /**
   * 检查是否有未提交的更改
   */
  private async hasUncommittedChanges(): Promise<boolean> {
    return !(await this.isClean())
  }

  /**
   * 获取远程 URL
   */
  private async getRemoteUrl(): Promise<string | null> {
    try {
      const result = await $`git remote get-url origin`.quiet()
      return result.stdout.trim() || null
    } catch {
      return null
    }
  }

  /**
   * 获取自最新标签以来的提交数
   */
  private async getCommitsSinceLastTag(): Promise<number> {
    try {
      const latestTag = await this.getLatestTag()
      if (!latestTag) {
        // 如果没有标签，返回总提交数
        const result = await $`git rev-list --count HEAD`.quiet()
        return Number.parseInt(result.stdout.trim(), 10) || 0
      }

      return await this.getCommitsSinceTag(latestTag)
    } catch {
      return 0
    }
  }

  /**
   * 获取短提交哈希
   */
  private async getShortHash(): Promise<string> {
    try {
      const result = await $`git rev-parse --short HEAD`.quiet()
      return result.stdout.trim()
    } catch (error) {
      throw new Error(
        `Failed to get git hash: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 将分支名转换为适合标签的格式
   */
  private slugifyBranchName(branchName: string): string {
    return branchName
      .replaceAll(/[^\w\-.]/g, '-') // 替换特殊字符为连字符
      .replaceAll(/\/+/g, '-') // 替换斜杠为连字符
      .replaceAll(/-+/g, '-') // 合并多个连字符
      .replaceAll(/^-+|-+$/g, '') // 移除开头和结尾的连字符
      .toLowerCase()
  }

  /**
   * 检查是否在 Git 仓库中
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await $`git rev-parse --git-dir`.quiet()
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取 Git 仓库根目录
   */
  async getRepositoryRoot(): Promise<string> {
    try {
      const result = await $`git rev-parse --show-toplevel`.quiet()
      return result.stdout.trim()
    } catch (error) {
      throw new Error(
        `Failed to get repository root: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 获取 Git 配置值
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const result = await $`git config --get ${key}`.quiet()
      return result.stdout.trim() || null
    } catch {
      return null
    }
  }

  /**
   * 设置 Git 配置值
   */
  async setConfig(key: string, value: string, global = false): Promise<void> {
    try {
      const scope = global ? '--global' : '--local'
      await $`git config ${scope} ${key} ${value}`.quiet()
    } catch (error) {
      throw new Error(
        `Failed to set git config ${key}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
