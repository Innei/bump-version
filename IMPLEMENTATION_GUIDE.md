# 实现指南

## 🎯 实现目标

将现有的单体 CLI 重构为模块化、可扩展的架构，提供更好的维护性和可测性。

## 📋 实现步骤

### 阶段 1: 基础架构搭建 (Week 1-2)

#### 1.1 创建核心接口和类型
- [x] 定义核心类型 (`src/types/index.ts`)
- [x] 创建服务接口 (`src/interfaces/services.ts`)
- [x] 设计插件系统类型 (`src/plugins/types.ts`)

#### 1.2 实现基础服务
```typescript
// 优先级顺序
1. IVersionService - 版本管理核心
2. IConfigService - 配置管理
3. IExecutionContext - 执行上下文
4. IPluginManager - 插件管理器
5. IGitService - Git 操作
```

#### 1.3 搭建测试框架
```bash
# 测试工具配置
- vitest (已有)
- @testing-library/node
- 测试覆盖率工具
- 集成测试环境
```

### 阶段 2: 核心服务实现 (Week 3-4)

#### 2.1 版本服务实现
```typescript
// src/services/VersionService.ts
export class VersionService implements IVersionService {
  async getCurrentVersion(packagePath: string): Promise<string> {
    // 从 package.json 读取当前版本
  }
  
  resolveTargetVersion(current: string, type: ReleaseType, preId?: string): string {
    // 基于 semver 计算目标版本
  }
  
  validateVersion(version: string): boolean {
    // 验证版本格式
  }
  
  async updatePackageVersion(packagePath: string, version: string): Promise<void> {
    // 更新 package.json 版本
  }
}
```

#### 2.2 配置服务实现
```typescript
// src/services/ConfigService.ts
export class ConfigService implements IConfigService {
  async resolveConfig(options: BumpOptions): Promise<ResolvedConfig> {
    // 合并多层配置
    const configs = await Promise.all([
      this.loadDefaults(),
      this.loadProjectConfig(),
      this.loadUserConfig(),
      this.loadEnvironmentConfig(),
      this.parseCliArguments(options)
    ])
    
    return this.mergeConfigs(...configs)
  }
}
```

#### 2.3 执行上下文实现
```typescript
// src/core/ExecutionContext.ts
export class ExecutionContext implements IExecutionContext {
  private state: ExecutionState
  private rollbackActions: RollbackAction[] = []
  private eventEmitter = new EventEmitter()
  
  constructor(
    public readonly options: BumpOptions,
    public readonly config: ResolvedConfig,
    public readonly packageInfo: PackageInfo,
    public readonly gitInfo: GitInfo
  ) {
    this.state = { phase: 'initializing', modifiedFiles: [], createdTags: [], publishedPackages: [] }
  }
  
  // 实现接口方法...
}
```

### 阶段 3: 插件系统实现 (Week 5-6)

#### 3.1 内置插件迁移
```typescript
// 将现有功能转为插件
1. GitPlugin - Git 操作 (从 src/utils/git.ts 迁移)
2. NpmPlugin - NPM 发布 (从发布逻辑迁移)
3. ChangelogPlugin - 变更日志 (从 src/utils/changelog.ts 迁移)
4. HookPlugin - 钩子执行 (从钩子逻辑迁移)
```

#### 3.2 插件示例实现
```typescript
// src/plugins/builtin/GitPlugin.ts
export class GitPlugin implements Plugin {
  readonly name = 'git'
  readonly version = '1.0.0'
  
  getHooks(): PluginHooks {
    return {
      postVersion: [
        {
          name: 'git-commit',
          execute: async (context) => {
            if (context.config.commit) {
              await this.commitChanges(context)
            }
          }
        },
        {
          name: 'git-tag',
          execute: async (context) => {
            if (context.config.tag) {
              await this.createTag(context)
            }
          }
        }
      ],
      postPublish: [
        {
          name: 'git-push',
          execute: async (context) => {
            if (context.config.push) {
              await this.pushChanges(context)
            }
          }
        }
      ]
    }
  }
  
  private async commitChanges(context: IExecutionContext) {
    // 实现提交逻辑
  }
  
  private async createTag(context: IExecutionContext) {
    // 实现标签创建逻辑
  }
  
  private async pushChanges(context: IExecutionContext) {
    // 实现推送逻辑
  }
}
```

### 阶段 4: 主流程重构 (Week 7-8)

#### 4.1 编排器实现
```typescript
// src/core/BumpOrchestrator.ts
export class BumpOrchestrator {
  constructor(
    private versionService: IVersionService,
    private configService: IConfigService,
    private pluginManager: IPluginManager,
    private gitService: IGitService,
    private packageService: IPackageService
  ) {}
  
  async execute(options: BumpOptions): Promise<BumpResult> {
    const context = await this.createExecutionContext(options)
    
    try {
      // 1. 验证前置条件
      await this.validatePreConditions(context)
      context.setState({ phase: 'validating' })
      
      // 2. 解析目标版本
      await this.resolveTargetVersion(context)
      context.setState({ phase: 'resolving-version' })
      
      // 3. 执行预处理钩子
      await this.pluginManager.executeHooks('preVersion', context)
      context.setState({ phase: 'pre-hooks' })
      
      // 4. 更新版本
      await this.performVersionBump(context)
      context.setState({ phase: 'updating-version' })
      
      // 5. 执行后处理钩子
      await this.pluginManager.executeHooks('postVersion', context)
      context.setState({ phase: 'post-hooks' })
      
      // 6. 发布 (如果需要)
      if (context.config.publish) {
        await this.pluginManager.executeHooks('prePublish', context)
        await this.performPublish(context)
        await this.pluginManager.executeHooks('postPublish', context)
      }
      context.setState({ phase: 'publishing' })
      
      // 7. 完成
      context.setState({ phase: 'completed' })
      return this.createSuccessResult(context)
      
    } catch (error) {
      context.setState({ phase: 'error' })
      await this.handleError(error, context)
      throw error
    }
  }
}
```

#### 4.2 CLI 入口重构
```typescript
// src/cli/BumpCommand.ts
export class BumpCommand {
  constructor(private orchestrator: BumpOrchestrator) {}
  
  async execute(args: string[]): Promise<void> {
    const options = this.parseArguments(args)
    
    try {
      const result = await this.orchestrator.execute(options)
      this.displayResult(result)
    } catch (error) {
      this.displayError(error)
      process.exit(1)
    }
  }
}
```

### 阶段 5: 测试和优化 (Week 9-10)

#### 5.1 测试实现
```typescript
// 测试结构
test/
├── unit/
│   ├── services/
│   │   ├── VersionService.test.ts
│   │   ├── ConfigService.test.ts
│   │   └── GitService.test.ts
│   ├── plugins/
│   │   ├── PluginManager.test.ts
│   │   └── builtin/
│   └── core/
│       ├── ExecutionContext.test.ts
│       └── BumpOrchestrator.test.ts
├── integration/
│   ├── full-workflow.test.ts
│   ├── plugin-system.test.ts
│   └── error-handling.test.ts
└── e2e/
    ├── cli-commands.test.ts
    └── real-project.test.ts
```

#### 5.2 性能优化
```typescript
// 优化点
1. 并发执行 Git 操作
2. 配置缓存机制
3. 插件懒加载
4. 大型项目的增量处理
```

## 🔧 开发工具配置

### TypeScript 配置更新
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "lib", "node_modules"]
}
```

### 构建配置
```typescript
// tsdown.config.ts 更新
export default {
  entry: {
    cli: 'src/cli/index.ts',
    lib: 'src/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  treeshake: true
}
```

### 依赖注入配置
```typescript
// src/container.ts
import { Container } from 'inversify'

const container = new Container()
container.bind<IVersionService>('VersionService').to(VersionService)
container.bind<IConfigService>('ConfigService').to(ConfigService)
container.bind<IGitService>('GitService').to(GitService)
// ... 其他服务绑定

export { container }
```

## 📊 迁移清单

### 现有代码迁移映射

| 现有文件 | 新架构位置 | 状态 |
|---------|-----------|------|
| `src/core/run.ts` | `src/core/BumpOrchestrator.ts` | 需重构 |
| `src/core/resolve-config.ts` | `src/services/ConfigService.ts` | 需重构 |
| `src/core/version.ts` | `src/services/VersionService.ts` | 需重构 |
| `src/utils/git.ts` | `src/plugins/builtin/GitPlugin.ts` | 需重构 |
| `src/utils/changelog.ts` | `src/plugins/builtin/ChangelogPlugin.ts` | 需重构 |
| `src/core/context.ts` | `src/core/ExecutionContext.ts` | 需重构 |
| `src/core/prompt.ts` | `src/cli/prompts/` | 需重构 |

### 新增组件

| 组件 | 路径 | 优先级 |
|------|------|-------|
| 插件管理器 | `src/plugins/PluginManager.ts` | 高 |
| 执行上下文 | `src/core/ExecutionContext.ts` | 高 |
| 服务容器 | `src/container.ts` | 中 |
| CLI 命令 | `src/cli/commands/` | 中 |
| 错误处理 | `src/core/ErrorHandler.ts` | 低 |

## 🧪 测试策略

### 单元测试
- 每个服务类 >= 90% 覆盖率
- 所有公开方法必须有测试
- Mock 外部依赖

### 集成测试
- 服务间协作测试
- 插件系统集成测试
- 配置解析集成测试

### 端到端测试
- 完整发布流程测试
- 错误场景测试
- 多包项目测试

## 🚀 部署准备

### 向后兼容
- 保持现有 CLI 接口不变
- 渐进式迁移现有配置
- 提供迁移工具

### 文档更新
- API 文档
- 插件开发指南
- 迁移指南
- 故障排除

### 发布计划
1. **Alpha 版本**: 核心功能完成
2. **Beta 版本**: 插件系统完成
3. **RC 版本**: 测试完成
4. **正式版本**: 生产就绪

## 📈 成功指标

- [ ] 代码行数减少 30%
- [ ] 测试覆盖率 >= 90%
- [ ] 插件系统可用
- [ ] 性能提升 20%
- [ ] 零破坏性变更