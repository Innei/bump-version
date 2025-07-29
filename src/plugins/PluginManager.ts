// 插件管理器实现示例
import type {
  Hook,
  HookPhase,
  IExecutionContext,
} from '../interfaces/services.js'
import type {
  IPluginContext,
  IPluginManager,
  Plugin,
  PluginConfig,
  PluginHooks,
} from './types.js'

export class PluginManager implements IPluginManager {
  private plugins = new Map<string, Plugin>()
  private pluginConfigs = new Map<string, PluginConfig>()
  private hooks = new Map<HookPhase, Hook[]>()
  private initialized = false

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`)
    }

    this.plugins.set(plugin.name, plugin)

    // 注册插件钩子
    const pluginHooks = plugin.getHooks?.()
    if (pluginHooks) {
      this.registerPluginHooks(pluginHooks)
    }
  }

  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      return
    }

    // 清理钩子
    this.unregisterPluginHooks(plugin)

    // 移除插件
    this.plugins.delete(pluginName)
    this.pluginConfigs.delete(pluginName)
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  getEnabledPlugins(): Plugin[] {
    return this.getPlugins().filter((plugin) => {
      const config = this.pluginConfigs.get(plugin.name)
      return config?.enabled !== false
    })
  }

  async initializePlugins(context: IExecutionContext): Promise<void> {
    if (this.initialized) {
      return
    }

    const enabledPlugins = this.getEnabledPlugins()

    for (const plugin of enabledPlugins) {
      try {
        const pluginContext = this.createPluginContext(plugin, context)

        // 配置插件
        const config = this.pluginConfigs.get(plugin.name)
        if (config && plugin.configure) {
          plugin.configure(config)
        }

        // 初始化插件
        if (plugin.initialize) {
          await plugin.initialize(pluginContext)
        }

        // 扩展执行上下文
        if (plugin.extendContext) {
          plugin.extendContext(context)
        }
      } catch (error) {
        console.error(`Failed to initialize plugin '${plugin.name}':`, error)
        throw error
      }
    }

    this.initialized = true
  }

  async destroyPlugins(): Promise<void> {
    if (!this.initialized) {
      return
    }

    const enabledPlugins = this.getEnabledPlugins()

    for (const plugin of enabledPlugins) {
      try {
        if (plugin.destroy) {
          await plugin.destroy()
        }
      } catch (error) {
        console.error(`Failed to destroy plugin '${plugin.name}':`, error)
      }
    }

    this.initialized = false
  }

  getHooks(phase: HookPhase): Hook[] {
    return this.hooks.get(phase) || []
  }

  async executeHooks(
    phase: HookPhase,
    context: IExecutionContext,
  ): Promise<void> {
    const hooks = this.getHooks(phase)

    for (const hook of hooks) {
      try {
        await hook.execute(context)
      } catch (error) {
        console.error(`Hook '${hook.name}' failed in phase '${phase}':`, error)

        // 尝试回滚
        if (hook.rollback) {
          try {
            await hook.rollback(context)
          } catch (rollbackError) {
            console.error(
              `Rollback failed for hook '${hook.name}':`,
              rollbackError,
            )
          }
        }

        throw error
      }
    }
  }

  extendConfig(baseConfig: any): any {
    let extendedConfig = { ...baseConfig }

    const enabledPlugins = this.getEnabledPlugins()

    for (const plugin of enabledPlugins) {
      if (plugin.extendConfig) {
        try {
          extendedConfig = plugin.extendConfig(extendedConfig)
        } catch (error) {
          console.error(
            `Plugin '${plugin.name}' failed to extend config:`,
            error,
          )
        }
      }
    }

    return extendedConfig
  }

  // 设置插件配置
  setPluginConfig(pluginName: string, config: PluginConfig): void {
    this.pluginConfigs.set(pluginName, config)
  }

  // 获取插件配置
  getPluginConfig(pluginName: string): PluginConfig | undefined {
    return this.pluginConfigs.get(pluginName)
  }

  private registerPluginHooks(pluginHooks: PluginHooks): void {
    for (const [phase, hooks] of Object.entries(pluginHooks)) {
      const phaseKey = phase as HookPhase
      const existingHooks = this.hooks.get(phaseKey) || []
      this.hooks.set(phaseKey, [...existingHooks, ...hooks])
    }
  }

  private unregisterPluginHooks(plugin: Plugin): void {
    const pluginHooks = plugin.getHooks?.()
    if (!pluginHooks) {
      return
    }

    for (const [phase, hooks] of Object.entries(pluginHooks)) {
      const phaseKey = phase as HookPhase
      const existingHooks = this.hooks.get(phaseKey) || []
      const filteredHooks = existingHooks.filter(
        (hook) =>
          !hooks.some((pluginHook: Hook) => pluginHook.name === hook.name),
      )
      this.hooks.set(phaseKey, filteredHooks)
    }
  }

  private createPluginContext(
    plugin: Plugin,
    context: IExecutionContext,
  ): IPluginContext {
    return {
      pluginName: plugin.name,
      config: this.pluginConfigs.get(plugin.name) || {
        enabled: true,
        options: {},
      },
      rootConfig: context.config,

      log: {
        debug: (message: string, ...args: any[]) =>
          console.info(`[${plugin.name}] DEBUG:`, message, ...args),
        info: (message: string, ...args: any[]) =>
          console.info(`[${plugin.name}]`, message, ...args),
        warn: (message: string, ...args: any[]) =>
          console.warn(`[${plugin.name}]`, message, ...args),
        error: (message: string, ...args: any[]) =>
          console.error(`[${plugin.name}]`, message, ...args),
      },

      utils: this.createPluginUtils(),

      emit: (event: string, data?: any) =>
        context.emit(`plugin:${plugin.name}:${event}`, data),
      on: (event: string, handler: (data?: any) => void) =>
        context.on(`plugin:${plugin.name}:${event}`, handler),

      getStorage: () => this.createPluginStorage(plugin.name),
    }
  }

  private createPluginUtils() {
    // 这里会创建工具方法的实际实现
    return {
      version: {
        inc: (_version: string, _type: string, _preId?: string) => {
          return _version
        },
        valid: (_version: string) => {
          return true
        },
        compare: (_a: string, _b: string) => {
          return 0
        },
      },
      fs: {
        exists: async (_path: string) => false,
        readFile: async (_path: string) => '',
        writeFile: async (_path: string, _content: string) => {},
        copyFile: async (_src: string, _dest: string) => {},
      },
      git: {
        getCurrentBranch: async () => 'main',
        getLatestTag: async () => null,
        isClean: async () => true,
        exec: async (_command: string) => '',
      },
      exec: async (_command: string, _options?: any) => ({
        stdout: '',
        stderr: '',
        exitCode: 0,
      }),
    }
  }

  private createPluginStorage(pluginName: string) {
    const storage = new Map<string, any>()

    return {
      get: <T = any>(key: string): T | undefined =>
        storage.get(`${pluginName}:${key}`),
      set: <T = any>(key: string, value: T) =>
        storage.set(`${pluginName}:${key}`, value),
      delete: (key: string) => storage.delete(`${pluginName}:${key}`),
      clear: () => {
        for (const key of storage.keys()) {
          if (key.startsWith(`${pluginName}:`)) {
            storage.delete(key)
          }
        }
      },
      has: (key: string) => storage.has(`${pluginName}:${key}`),
    }
  }
}
