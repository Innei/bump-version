import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join as pathJoin } from 'node:path'

import { chalk } from 'zx'

import { WORKSPACE_DIR } from '../constants/path.js'
import { resolveArgs } from './resolve-args.js'

const DEFAULT_CONFIG_TEMPLATE = `import { defineConfig } from 'nbump'

export default defineConfig({
  // leading hooks, run before bumping version
  leading: [],
  
  // tailing hooks, run after bumping version
  trailing: [],
  
  // finally hooks, run at the end
  finally: [],
  
  // whether to create git tag
  tag: true,
  
  // whether to push to remote
  push: true,
  
  // commit message template
  commitMessage: 'release: v\${NEW_VERSION}',
  
  // whether to publish to npm
  publish: false,
  
  // whether to generate changelog
  changelog: false,
  
  // allowed branches for release
  allowedBranches: ['main', 'master'],
  
  // tag prefix
  tagPrefix: 'v',
  
  // mode: 'independent' | 'monorepo'
  mode: 'independent',
  
  // allow release on dirty git tree
  allowDirty: false,
  
  // whether to commit changes
  commit: true,
})
`

async function checkConfigExists(): Promise<boolean> {
  const { configPath } = resolveArgs()

  if (configPath) {
    // If custom config path is provided, check if it exists
    return existsSync(configPath)
  }

  // Check for common config file names in workspace
  const commonConfigNames = [
    'bump.config.ts',
    'bump.config.js',
    'bump.config.mjs',
    'bump.config.json',
  ]

  for (const configName of commonConfigNames) {
    const configFilePath = pathJoin(WORKSPACE_DIR, configName)
    if (existsSync(configFilePath)) {
      return true
    }
  }

  // Check if config exists in package.json
  try {
    const packageJsonPath = pathJoin(WORKSPACE_DIR, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const hasConfig = packageJson.bump || packageJson.config?.bump
      return !!hasConfig
    }
  } catch {
    // Ignore errors when reading package.json
  }

  return false
}

export async function initConfig() {
  const configFileName = 'bump.config.ts'
  const configPath = pathJoin(WORKSPACE_DIR, configFileName)

  console.info(chalk.blue('Initializing bump configuration...'))

  // Check if config already exists
  const configExists = await checkConfigExists()
  if (configExists) {
    console.info(
      chalk.yellow(`Configuration already exists. Skipping initialization.`),
    )
    console.info(
      chalk.gray(
        `To recreate config, please remove existing configuration file first.`,
      ),
    )
    return
  }

  console.info(chalk.gray('No configuration found, creating default config...'))

  try {
    writeFileSync(configPath, DEFAULT_CONFIG_TEMPLATE, 'utf-8')
    console.info(chalk.green(`✅ Created ${configFileName} successfully!`))
    console.info(
      chalk.blue(
        `📝 Edit ${configFileName} to customize your bump configuration.`,
      ),
    )
    console.info(chalk.gray(`💡 Run 'bump --help' to see available options.`))
  } catch (error) {
    console.error(chalk.red(`❌ Failed to create ${configFileName}:`), error)
    process.exit(1)
  }
}
