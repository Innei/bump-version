# CLI 架构重构设计

## 🎯 设计目标

- **模块化**: 清晰的职责分离，高内聚低耦合
- **可扩展**: 支持插件系统，易于添加新功能
- **可测试**: 每个模块都能独立测试
- **可维护**: 代码结构清晰，便于理解和修改
- **类型安全**: 完整的 TypeScript 类型定义

## 🏗️ 新架构层次

```
┌─────────────────────────────────────┐
│             CLI Layer               │ ← 命令行接口层
├─────────────────────────────────────┤
│           Service Layer             │ ← 业务服务层
├─────────────────────────────────────┤
│           Core Layer                │ ← 核心逻辑层
├─────────────────────────────────────┤
│          Provider Layer             │ ← 数据提供层
├─────────────────────────────────────┤
│          Infrastructure             │ ← 基础设施层
└─────────────────────────────────────┘
```

## 📦 模块架构

### 1. CLI Layer (命令行接口层)
```typescript
src/cli/
├── commands/          # 命令处理器
│   ├── BumpCommand.ts
│   ├── InfoCommand.ts
│   └── HelpCommand.ts
├── parsers/           # 参数解析器
│   ├── ArgumentParser.ts
│   └── ConfigParser.ts
└── presenters/        # 输出格式化
    ├── ConsolePresenter.ts
    └── JsonPresenter.ts
```

### 2. Service Layer (业务服务层)
```typescript
src/services/
├── BumpService.ts     # 版本升级服务
├── ReleaseService.ts  # 发布流程服务
├── GitService.ts      # Git 操作服务
├── PackageService.ts  # 包管理服务
└── HookService.ts     # 钩子执行服务
```

### 3. Core Layer (核心逻辑层)
```typescript
src/core/
├── models/            # 领域模型
│   ├── Version.ts
│   ├── Release.ts
│   ├── Package.ts
│   └── Config.ts
├── engines/           # 执行引擎
│   ├── VersionEngine.ts
│   ├── ReleaseEngine.ts
│   └── PublishEngine.ts
└── strategies/        # 策略模式
    ├── VersionStrategy.ts
    ├── TagStrategy.ts
    └── PublishStrategy.ts
```

### 4. Provider Layer (数据提供层)
```typescript
src/providers/
├── ConfigProvider.ts  # 配置提供者
├── PackageProvider.ts # 包信息提供者
├── GitProvider.ts     # Git 信息提供者
└── RegistryProvider.ts# 注册表提供者
```

### 5. Infrastructure Layer (基础设施层)
```typescript
src/infrastructure/
├── filesystem/        # 文件系统操作
├── network/          # 网络请求
├── process/          # 进程执行
└── logging/          # 日志系统
```

## 🔌 插件系统设计

### 插件架构
```typescript
src/plugins/
├── PluginManager.ts   # 插件管理器
├── PluginRegistry.ts  # 插件注册表
├── types/            # 插件类型定义
│   ├── HookPlugin.ts
│   ├── VersionPlugin.ts
│   └── PublishPlugin.ts
└── builtin/          # 内置插件
    ├── GitPlugin.ts
    ├── NpmPlugin.ts
    └── ChangelogPlugin.ts
```

### 插件接口
```typescript
interface Plugin {
  name: string
  version: string
  hooks: PluginHooks
  configure(config: PluginConfig): void
  execute(context: ExecutionContext): Promise<void>
}

interface PluginHooks {
  beforeVersion?: Hook[]
  afterVersion?: Hook[]
  beforePublish?: Hook[]
  afterPublish?: Hook[]
}
```

## 🎛️ 状态管理

### 执行上下文
```typescript
class ExecutionContext {
  readonly config: ResolvedConfig
  readonly package: PackageInfo
  readonly git: GitInfo
  private state: ExecutionState

  // 状态访问方法
  getCurrentVersion(): string
  getTargetVersion(): string
  setTargetVersion(version: string): void
  
  // 事件发布
  emit(event: string, data: any): void
  on(event: string, handler: EventHandler): void
}
```

## 🚀 执行流程重设计

### 主流程
```typescript
class BumpOrchestrator {
  async execute(options: BumpOptions): Promise<BumpResult> {
    const context = await this.createContext(options)
    
    try {
      await this.validatePreConditions(context)
      await this.resolveTargetVersion(context)
      await this.executePreHooks(context)
      await this.performVersionBump(context)
      await this.executePostHooks(context)
      await this.publishIfNeeded(context)
      
      return this.createSuccessResult(context)
    } catch (error) {
      await this.handleError(error, context)
      throw error
    }
  }
}
```

## 🧪 测试策略

### 测试层次
1. **单元测试**: 每个模块独立测试
2. **集成测试**: 模块间协作测试
3. **端到端测试**: 完整流程测试
4. **契约测试**: 插件接口测试

### 测试结构
```
test/
├── unit/              # 单元测试
│   ├── services/
│   ├── core/
│   └── providers/
├── integration/       # 集成测试
├── e2e/              # 端到端测试
└── fixtures/         # 测试数据
```

## 📈 性能优化

### 并发执行
- Git 操作并行化
- 多包并发处理
- 异步钩子执行

### 缓存策略
- 配置缓存
- Git 信息缓存
- 包信息缓存

### 增量处理
- 智能依赖分析
- 增量版本检查
- 选择性操作执行

## 🔧 配置系统重设计

### 配置层次
1. **默认配置**: 内置默认值
2. **项目配置**: bump.config.ts
3. **用户配置**: ~/.bumprc
4. **环境变量**: BUMP_*
5. **命令行参数**: --flag

### 配置合并策略
```typescript
class ConfigResolver {
  async resolve(): Promise<ResolvedConfig> {
    const configs = await Promise.all([
      this.loadDefaults(),
      this.loadProject(),
      this.loadUser(),
      this.loadEnvironment(),
      this.loadArguments()
    ])
    
    return this.merge(...configs)
  }
}
```

## 🌟 关键改进点

### 1. 职责分离
- 每个类只负责一个明确的职责
- 服务层专注业务逻辑
- 基础设施层处理技术细节

### 2. 依赖注入
- 使用依赖注入容器
- 接口编程，便于测试和扩展
- 配置驱动的组件装配

### 3. 事件驱动
- 基于事件的插件系统
- 松耦合的组件通信
- 可观测的执行流程

### 4. 错误恢复
- 统一的错误处理机制
- 自动回滚能力
- 详细的错误上下文

## 🚀 迁移策略

### 阶段 1: 基础重构
- 提取核心模型
- 分离服务层
- 建立测试框架

### 阶段 2: 插件化
- 实现插件系统
- 迁移现有功能为插件
- 建立插件生态

### 阶段 3: 优化增强
- 性能优化
- 用户体验改进
- 高级功能开发

## 📋 实现检查清单

- [ ] 设计核心接口
- [ ] 实现基础框架
- [ ] 迁移现有功能
- [ ] 建立测试套件
- [ ] 性能基准测试
- [ ] 文档更新