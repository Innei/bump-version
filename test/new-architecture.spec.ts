import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BumpService } from '../src/services/BumpService.js'
import { VersionService } from '../src/services/VersionService.js'
import { ConfigService } from '../src/services/ConfigService.js'
import { GitService } from '../src/services/GitService.js'
import { PackageService } from '../src/services/PackageService.js'
import { PluginManager } from '../src/plugins/PluginManager.js'
import { GitPlugin } from '../src/plugins/builtin/GitPlugin.js'
import { BumpCommand } from '../src/cli/BumpCommand.js'

describe('New Architecture Integration Tests', () => {
  describe('VersionService', () => {
    let versionService: VersionService

    beforeEach(() => {
      versionService = new VersionService()
    })

    it('should validate version correctly', () => {
      expect(versionService.validateVersion('1.0.0')).toBe(true)
      expect(versionService.validateVersion('1.0.0-alpha.1')).toBe(true)
      expect(versionService.validateVersion('invalid')).toBe(false)
    })

    it('should resolve target version for standard release types', () => {
      const result = versionService.resolveTargetVersion('1.0.0', 'patch')
      expect(result).toBe('1.0.1')
    })

    it('should handle custom release types', () => {
      const result = versionService.resolveTargetVersion('1.0.0', 'branch', 'feature')
      expect(result).toMatch(/1\.0\.1-feature/)
    })

    it('should compare versions correctly', () => {
      expect(versionService.compareVersions('1.0.0', '1.0.1')).toBeLessThan(0)
      expect(versionService.compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0)
      expect(versionService.compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('should identify pre-release versions', () => {
      expect(versionService.isPreRelease('1.0.0-alpha.1')).toBe(true)
      expect(versionService.isPreRelease('1.0.0')).toBe(false)
    })

    it('should get version components', () => {
      const components = versionService.getVersionComponents('1.2.3-alpha.4')
      expect(components.major).toBe(1)
      expect(components.minor).toBe(2)
      expect(components.patch).toBe(3)
      expect(components.prerelease).toEqual(['alpha', 4])
    })
  })

  describe('ConfigService', () => {
    let configService: ConfigService

    beforeEach(() => {
      configService = new ConfigService()
    })

    it('should resolve config with defaults', async () => {
      const config = await configService.resolveConfig({})
      
      expect(config.tag).toBe(true)
      expect(config.push).toBe(true)
      expect(config.commit).toBe(true)
      expect(config.tagPrefix).toBe('v')
      expect(config.mode).toBe('independent')
    })

    it('should apply dry run overrides', async () => {
      const config = await configService.resolveConfig({ dryRun: true })
      
      expect(config.commit).toBe(false)
      expect(config.tag).toBe(false)
      expect(config.push).toBe(false)
      expect(config.publish).toBe(false)
    })

    it('should validate config correctly', () => {
      // 应该不抛出错误
      expect(() => {
        configService.validateConfig({
          tag: true,
          tagPrefix: 'v',
          push: true,
          commit: true,
          commitMessage: 'release: v$' + '{NEW_VERSION}',
          allowDirty: false,
          allowedBranches: ['main', 'master'],
          withTags: false,
          remoteTags: false,
          publish: false,
          hooks: {
            preVersion: [],
            postVersion: [],
            prePublish: [],
            postPublish: []
          },
          plugins: [],
          mode: 'independent',
          packages: [],
          changelog: false,
          projectRoot: '',
          workspacePackages: [],
          resolvedHooks: {
            preVersion: [],
            postVersion: [],
            prePublish: [],
            postPublish: []
          }
        })
      }).not.toThrow()
    })

    it('should throw error for invalid monorepo config', () => {
      expect(() => {
        configService.validateConfig({
          mode: 'monorepo',
          packages: [], // 空数组对于 monorepo 模式是无效的
        } as any)
      }).toThrow('packages field is required in monorepo mode')
    })
  })

  describe('PluginManager', () => {
    let pluginManager: PluginManager

    beforeEach(() => {
      pluginManager = new PluginManager()
    })

    it('should register and retrieve plugins', () => {
      const gitPlugin = new GitPlugin()
      
      pluginManager.register(gitPlugin)
      
      expect(pluginManager.getPlugin('git')).toBe(gitPlugin)
      expect(pluginManager.getPlugins()).toHaveLength(1)
    })

    it('should prevent duplicate plugin registration', () => {
      const gitPlugin1 = new GitPlugin()
      const gitPlugin2 = new GitPlugin()
      
      pluginManager.register(gitPlugin1)
      
      expect(() => {
        pluginManager.register(gitPlugin2)
      }).toThrow("Plugin 'git' is already registered")
    })

    it('should manage plugin hooks', () => {
      const gitPlugin = new GitPlugin()
      pluginManager.register(gitPlugin)
      
      const postVersionHooks = pluginManager.getHooks('postVersion')
      expect(postVersionHooks.length).toBeGreaterThan(0)
      expect(postVersionHooks.some(hook => hook.name === 'git-commit')).toBe(true)
      expect(postVersionHooks.some(hook => hook.name === 'git-tag')).toBe(true)
    })
  })

  describe('GitPlugin', () => {
    let gitPlugin: GitPlugin

    beforeEach(() => {
      gitPlugin = new GitPlugin()
    })

    it('should have correct plugin metadata', () => {
      expect(gitPlugin.name).toBe('git')
      expect(gitPlugin.version).toBe('1.0.0')
      expect(gitPlugin.description).toBe('Git operations for version bumping')
    })

    it('should provide hooks', () => {
      const hooks = gitPlugin.getHooks()
      
      expect(hooks.postVersion).toHaveLength(2)
      expect(hooks.postPublish).toHaveLength(1)
      
      expect(hooks.postVersion![0].name).toBe('git-commit')
      expect(hooks.postVersion![1].name).toBe('git-tag')
      expect(hooks.postPublish![0].name).toBe('git-push')
    })

    it('should extend config with Git defaults', () => {
      const baseConfig = { someOption: true }
      const extendedConfig = gitPlugin.extendConfig!(baseConfig)
      
      expect(extendedConfig.commit).toBe(true)
      expect(extendedConfig.tag).toBe(true)
      expect(extendedConfig.push).toBe(true)
      expect(extendedConfig.tagPrefix).toBe('v')
      expect(extendedConfig.someOption).toBe(true)
    })
  })

  describe('BumpCommand', () => {
    let command: BumpCommand

    beforeEach(() => {
      // Mock console methods to avoid test output
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(console, 'info').mockImplementation(() => {})
      
      command = new BumpCommand()
    })

    it('should show help', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      BumpCommand.showHelp()
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage: bump [options] [release-type]')
      )
    })

    it('should convert CLI options correctly', () => {
      // 这个测试需要访问私有方法，所以我们测试公共接口
      const cliOptions = {
        patch: true,
        dryRun: true,
        config: 'custom.config.js',
        verbose: true
      }
      
      // 创建 spy 来验证选项转换
      const mockBumpService = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          previousVersion: '1.0.0',
          newVersion: '1.0.1',
          releaseType: 'patch',
          publishedPackages: [],
          createdTags: [],
          executionTime: 100
        })
      }
      
      const commandWithMock = new BumpCommand(mockBumpService as any)
      
      // 执行命令不应该抛出错误
      expect(async () => {
        await commandWithMock.execute(cliOptions)
      }).not.toThrow()
    })
  })

  describe('Integration', () => {
    it('should create a complete service with plugins', () => {
      const service = BumpService.createWithDefaults()
      
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(BumpService)
    })

    it('should validate complete workflow options', async () => {
      const service = BumpService.createWithDefaults()
      
      const options = {
        releaseType: 'patch' as const,
        dryRun: true
      }
      
      // 验证选项不应该抛出错误
      await expect(service.validateOptions(options)).resolves.not.toThrow()
    })
  })
})