#!/usr/bin/env node

/**
 * 新架构的主入口点
 *
 * 这个文件展示如何使用重构后的架构
 * 同时保持与现有 CLI 接口的兼容性
 */
import { BumpCommand } from './cli/BumpCommand.js'
import { resolveArgs } from './core/resolve-args.js'

// 设置环境
process.env.FORCE_COLOR = String(3)
// @ts-ignore
globalThis.__DEV__ = process.env.NODE_ENV === 'development'

async function main() {
  try {
    // 解析命令行参数（使用现有的解析器保持兼容性）
    const args = resolveArgs()

    // 处理帮助和版本信息
    if (args.help) {
      BumpCommand.showHelp()
      process.exit(0)
    }

    if (args.v) {
      await BumpCommand.showVersion()
      process.exit(0)
    }

    if (args.info) {
      console.info('🚀 Bump Version Tool - New Architecture')
      console.info('📦 Package: nbump')
      console.info('🏗️  Architecture: Modular Plugin-based')
      console.info(
        '🔧 Services: Version, Config, Git, Package, Plugin Management',
      )
      console.info('🔌 Plugins: Git, Changelog, NPM (extensible)')
      console.info('💾 State Management: Execution Context with Rollback')
      console.info('🧪 Testing: Comprehensive test coverage')
      process.exit(0)
    }

    // 转换参数为新的 CLI 选项格式
    const cliOptions = {
      // 版本控制选项
      patch: args.patch,
      minor: args.minor,
      major: args.major,
      prepatch: args.prepatch,
      preminor: args.preminor,
      premajor: args.premajor,
      prerelease: args.prerelease,
      branch: args.branch,

      // 控制选项
      dryRun: args.dryRun,
      force: args.noVerify, // 映射现有的 noVerify 到 force

      // 配置选项
      filter: args.filter,
      config: args.configPath,

      // 输出选项
      verbose: __DEV__,
      json: false,
      quiet: false,
    }

    // 创建并执行命令
    const command = new BumpCommand()
    await command.execute(cliOptions)
  } catch (error) {
    console.error(
      '❌ Unexpected error:',
      error instanceof Error ? error.message : String(error),
    )

    if (__DEV__) {
      console.error('Stack trace:', error)
    }

    process.exit(1)
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  if (__DEV__) {
    console.error(error.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason)
  process.exit(1)
})

// 启动应用
main().catch((error) => {
  console.error('❌ Main function failed:', error)
  process.exit(1)
})
