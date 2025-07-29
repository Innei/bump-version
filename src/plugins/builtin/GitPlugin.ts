import type { Hook, IExecutionContext } from '../../interfaces/services.js'
import type { IPluginContext, Plugin, PluginHooks } from '../types.js'

/**
 * Git 操作插件
 *
 * 负责：
 * - Git 提交和标签创建
 * - 推送到远程仓库
 * - Git 状态验证
 */
export class GitPlugin implements Plugin {
  readonly name = 'git'
  readonly version = '1.0.0'
  readonly description = 'Git operations for version bumping'
  readonly author = 'bump-version'

  private context?: IPluginContext

  async initialize(context: IPluginContext): Promise<void> {
    this.context = context
    context.log.info('Git plugin initialized')
  }

  configure(config: any): void {
    if (this.context) {
      this.context.log.info('Git plugin configured', config)
    }
  }

  async destroy(): Promise<void> {
    if (this.context) {
      this.context.log.info('Git plugin destroyed')
    }
  }

  getHooks(): PluginHooks {
    return {
      postVersion: [
        {
          name: 'git-commit',
          execute: this.commitChanges.bind(this),
          rollback: this.rollbackCommit.bind(this),
        },
        {
          name: 'git-tag',
          execute: this.createTag.bind(this),
          rollback: this.rollbackTag.bind(this),
        },
      ],
      postPublish: [
        {
          name: 'git-push',
          execute: this.pushChanges.bind(this),
          rollback: this.rollbackPush.bind(this),
        },
      ],
    }
  }

  /**
   * 提交更改钩子
   */
  private async commitChanges(context: IExecutionContext): Promise<void> {
    if (!context.config.commit) {
      this.context?.log.info('Commit disabled, skipping git commit')
      return
    }

    if (context.options.dryRun) {
      this.context?.log.info('Dry run mode, skipping git commit')
      return
    }

    try {
      const targetVersion = context.getTargetVersion()
      if (!targetVersion) {
        throw new Error('No target version available for commit message')
      }

      // 构建提交消息
      const commitMessage = context.config.commitMessage.replace(
        '$' + '{NEW_VERSION}',
        targetVersion,
      )

      const state = context.getState()
      const filesToCommit =
        state.modifiedFiles.length > 0 ? state.modifiedFiles : ['package.json']

      this.context?.log.info(`Committing changes: ${filesToCommit.join(', ')}`)

      // 使用 Git 服务进行提交
      const gitService = this.getGitService(context)
      await gitService.commit(commitMessage, filesToCommit)

      this.context?.log.info(
        `Successfully committed changes with message: "${commitMessage}"`,
      )

      // 添加回滚操作
      context.addRollbackAction({
        description: 'Rollback git commit',
        execute: async () => {
          await gitService.executeCommand('reset HEAD~1')
        },
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.context?.log.error('Failed to commit changes:', errorMessage)
      throw new Error(`Git commit failed: ${errorMessage}`)
    }
  }

  /**
   * 创建标签钩子
   */
  private async createTag(context: IExecutionContext): Promise<void> {
    if (!context.config.tag) {
      this.context?.log.info('Tag creation disabled, skipping git tag')
      return
    }

    if (context.options.dryRun) {
      this.context?.log.info('Dry run mode, skipping git tag creation')
      return
    }

    try {
      const targetVersion = context.getTargetVersion()
      if (!targetVersion) {
        throw new Error('No target version available for tag creation')
      }

      const tagName = `${context.config.tagPrefix}${targetVersion}`
      const tagMessage = `Release ${tagName}`

      this.context?.log.info(`Creating tag: ${tagName}`)

      const gitService = this.getGitService(context)
      await gitService.createTag(tagName, tagMessage)

      // 更新执行状态
      context.addCreatedTag(tagName)

      this.context?.log.info(`Successfully created tag: ${tagName}`)

      // 添加回滚操作
      context.addRollbackAction({
        description: `Delete git tag ${tagName}`,
        execute: async () => {
          await gitService.deleteTag(tagName)
        },
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.context?.log.error('Failed to create tag:', errorMessage)
      throw new Error(`Git tag creation failed: ${errorMessage}`)
    }
  }

  /**
   * 推送更改钩子
   */
  private async pushChanges(context: IExecutionContext): Promise<void> {
    if (!context.config.push) {
      this.context?.log.info('Push disabled, skipping git push')
      return
    }

    if (context.options.dryRun) {
      this.context?.log.info('Dry run mode, skipping git push')
      return
    }

    try {
      this.context?.log.info('Pushing changes to remote repository')

      const gitService = this.getGitService(context)

      // 推送提交和标签
      const withTags =
        context.config.tag && context.getState().createdTags.length > 0
      await gitService.push(withTags)

      this.context?.log.info('Successfully pushed changes to remote repository')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      this.context?.log.error('Failed to push changes:', errorMessage)

      // 推送失败不应该阻止整个流程，只记录警告
      this.context?.log.warn('Git push failed, but continuing with the process')
    }
  }

  /**
   * 回滚提交
   */
  private async rollbackCommit(context: IExecutionContext): Promise<void> {
    if (context.options.dryRun) {
      return
    }

    try {
      this.context?.log.info('Rolling back git commit')
      const gitService = this.getGitService(context)
      await gitService.executeCommand('reset HEAD~1')
      this.context?.log.info('Successfully rolled back git commit')
    } catch (error) {
      this.context?.log.error('Failed to rollback git commit:', error)
    }
  }

  /**
   * 回滚标签
   */
  private async rollbackTag(context: IExecutionContext): Promise<void> {
    if (context.options.dryRun) {
      return
    }

    try {
      const state = context.getState()
      const createdTags = state.createdTags

      if (createdTags.length > 0) {
        const gitService = this.getGitService(context)

        for (const tag of createdTags) {
          try {
            this.context?.log.info(`Rolling back git tag: ${tag}`)
            await gitService.deleteTag(tag)
            this.context?.log.info(`Successfully rolled back git tag: ${tag}`)
          } catch (error) {
            this.context?.log.error(`Failed to rollback git tag ${tag}:`, error)
          }
        }
      }
    } catch (error) {
      this.context?.log.error('Failed to rollback git tags:', error)
    }
  }

  /**
   * 回滚推送（通常不可能）
   */
  private async rollbackPush(_context: IExecutionContext): Promise<void> {
    // 推送到远程后很难回滚，这里只记录警告
    this.context?.log.warn('Cannot rollback git push to remote repository')
    this.context?.log.warn('You may need to manually revert the remote changes')
  }

  /**
   * 获取 Git 服务实例
   */
  private getGitService(context: IExecutionContext): any {
    // 在实际实现中，这应该从依赖注入容器中获取
    // 这里简化处理，假设可以从上下文获取
    return (
      (context as any).gitService || {
        commit: async (message: string, files: string[]) => {
          this.context?.log.info(
            `Mock git commit: ${message}, files: ${files.join(', ')}`,
          )
        },
        createTag: async (tag: string, message: string) => {
          this.context?.log.info(`Mock git tag: ${tag} - ${message}`)
        },
        push: async (withTags: boolean) => {
          this.context?.log.info(`Mock git push, withTags: ${withTags}`)
        },
        deleteTag: async (tag: string) => {
          this.context?.log.info(`Mock git delete tag: ${tag}`)
        },
        executeCommand: async (command: string) => {
          this.context?.log.info(`Mock git command: ${command}`)
        },
      }
    )
  }

  /**
   * 扩展配置以包含 Git 相关选项
   */
  extendConfig(config: any): any {
    return {
      ...config,
      // 确保 Git 相关配置有默认值
      commit: config.commit ?? true,
      tag: config.tag ?? true,
      push: config.push ?? true,
      tagPrefix: config.tagPrefix ?? 'v',
      commitMessage: config.commitMessage ?? 'release: v$' + '{NEW_VERSION}',
    }
  }

  /**
   * 扩展执行上下文
   */
  extendContext(context: IExecutionContext): void {
    // 可以在这里为上下文添加 Git 相关的方法
    ;(context as any).gitPlugin = this
  }
}
