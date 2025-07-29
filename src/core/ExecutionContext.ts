import { EventEmitter } from 'node:events'
import type {
  IExecutionContext,
  ResolvedConfig,
  RollbackAction,
} from '../interfaces/services.js'
import type {
  BumpOptions,
  ExecutionState,
  GitInfo,
  PackageInfo,
} from '../types/index.js'

/**
 * 执行上下文实现
 *
 * 负责：
 * - 管理执行状态
 * - 协调版本信息
 * - 处理回滚操作
 * - 事件通信
 */
export class ExecutionContext implements IExecutionContext {
  private state: ExecutionState
  private rollbackActions: RollbackAction[] = []
  private eventEmitter = new EventEmitter()
  private targetVersion?: string

  constructor(
    public readonly options: BumpOptions,
    public readonly config: ResolvedConfig,
    public readonly packageInfo: PackageInfo,
    public readonly gitInfo: GitInfo,
  ) {
    this.state = {
      phase: 'initializing',
      modifiedFiles: [],
      createdTags: [],
      publishedPackages: [],
      rollbackActions: [],
    }

    // 设置最大监听器数量以避免警告
    this.eventEmitter.setMaxListeners(50)
  }

  getState(): ExecutionState {
    return { ...this.state }
  }

  setState(newState: Partial<ExecutionState>): void {
    this.state = {
      ...this.state,
      ...newState,
    }

    // 发出状态变更事件
    this.emit('state:changed', this.state)
  }

  getCurrentVersion(): string {
    return this.packageInfo.version
  }

  getTargetVersion(): string | undefined {
    return this.targetVersion
  }

  setTargetVersion(version: string): void {
    if (!version) {
      throw new Error('Target version cannot be empty')
    }

    const previousVersion = this.targetVersion
    this.targetVersion = version

    this.emit('version:changed', {
      previous: previousVersion,
      current: version,
    })
  }

  addRollbackAction(action: RollbackAction): void {
    this.rollbackActions.push(action)

    // 更新状态中的回滚操作列表
    this.setState({
      rollbackActions: [...this.rollbackActions],
    })

    this.emit('rollback:action-added', {
      action: action.description,
      totalActions: this.rollbackActions.length,
    })
  }

  async executeRollback(): Promise<void> {
    if (this.rollbackActions.length === 0) {
      this.emit('rollback:no-actions')
      return
    }

    this.emit('rollback:start', {
      totalActions: this.rollbackActions.length,
    })

    const errors: Error[] = []

    // 按相反顺序执行回滚操作
    for (let i = this.rollbackActions.length - 1; i >= 0; i--) {
      const action = this.rollbackActions[i]

      try {
        this.emit('rollback:action-start', {
          description: action.description,
          index: i,
        })

        await action.execute()

        this.emit('rollback:action-complete', {
          description: action.description,
          index: i,
        })
      } catch (error) {
        const rollbackError =
          error instanceof Error ? error : new Error(String(error))
        errors.push(rollbackError)

        this.emit('rollback:action-failed', {
          description: action.description,
          index: i,
          error: rollbackError,
        })
      }
    }

    // 清空回滚操作列表
    this.rollbackActions = []
    this.setState({ rollbackActions: [] })

    if (errors.length > 0) {
      this.emit('rollback:completed-with-errors', {
        errorCount: errors.length,
        errors,
      })

      // 抛出聚合错误
      throw new AggregateError(
        errors,
        `Rollback completed with ${errors.length} errors`,
      )
    } else {
      this.emit('rollback:completed')
    }
  }

  emit(event: string, data?: any): void {
    // 添加时间戳和上下文信息
    const eventData = {
      timestamp: new Date().toISOString(),
      phase: this.state.phase,
      targetVersion: this.targetVersion,
      data,
    }

    this.eventEmitter.emit(event, eventData)
  }

  on(event: string, handler: (data?: any) => void): void {
    this.eventEmitter.on(event, handler)
  }

  once(event: string, handler: (data?: any) => void): void {
    this.eventEmitter.once(event, handler)
  }

  off(event: string, handler: (data?: any) => void): void {
    this.eventEmitter.off(event, handler)
  }

  // 工具方法

  /**
   * 检查是否处于干运行模式
   */
  isDryRun(): boolean {
    return this.options.dryRun === true
  }

  /**
   * 检查是否应该跳过某个步骤
   */
  shouldSkip(step: 'hooks' | 'tests' | 'publish'): boolean {
    switch (step) {
      case 'hooks': {
        return this.options.skipHooks === true
      }
      case 'tests': {
        return this.options.skipTests === true
      }
      case 'publish': {
        return this.options.skipPublish === true
      }
      default: {
        return false
      }
    }
  }

  /**
   * 添加修改的文件到状态
   */
  addModifiedFile(filePath: string): void {
    const currentFiles = this.state.modifiedFiles
    if (!currentFiles.includes(filePath)) {
      this.setState({
        modifiedFiles: [...currentFiles, filePath],
      })

      this.emit('file:modified', { filePath })
    }
  }

  /**
   * 添加创建的标签到状态
   */
  addCreatedTag(tag: string): void {
    const currentTags = this.state.createdTags
    if (!currentTags.includes(tag)) {
      this.setState({
        createdTags: [...currentTags, tag],
      })

      this.emit('tag:created', { tag })
    }
  }

  /**
   * 添加发布的包到状态
   */
  addPublishedPackage(packageName: string): void {
    const currentPackages = this.state.publishedPackages
    if (!currentPackages.includes(packageName)) {
      this.setState({
        publishedPackages: [...currentPackages, packageName],
      })

      this.emit('package:published', { packageName })
    }
  }

  /**
   * 获取执行摘要
   */
  getSummary() {
    return {
      phase: this.state.phase,
      currentVersion: this.getCurrentVersion(),
      targetVersion: this.getTargetVersion(),
      modifiedFiles: this.state.modifiedFiles.length,
      createdTags: this.state.createdTags.length,
      publishedPackages: this.state.publishedPackages.length,
      rollbackActions: this.rollbackActions.length,
      isDryRun: this.isDryRun(),
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.eventEmitter.removeAllListeners()
    this.rollbackActions = []
  }
}
