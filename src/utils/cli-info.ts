import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chalk } from 'zx'

import { resolveConfig } from '../core/resolve-config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function showHelp() {
  console.info(`
${chalk.bold('nbump')} - Smart version bumping tool

${chalk.bold('USAGE:')}
  ${chalk.cyan('bump')} [options] [version-type]
  ${chalk.cyan('vv')} [options] [version-type]

${chalk.bold('VERSION TYPES:')}
  ${chalk.green('patch')}      Patch release (1.0.0 → 1.0.1)
  ${chalk.green('minor')}      Minor release (1.0.0 → 1.1.0)  
  ${chalk.green('major')}      Major release (1.0.0 → 2.0.0)
  ${chalk.green('premajor')}   Pre-major release (1.0.0 → 2.0.0-0)
  ${chalk.green('preminor')}   Pre-minor release (1.0.0 → 1.1.0-0)
  ${chalk.green('prepatch')}   Pre-patch release (1.0.0 → 1.0.1-0)
  ${chalk.green('prerelease')} Pre-release (1.0.0-0 → 1.0.0-1)
  ${chalk.green('alpha')}      Alpha release (alias for prerelease)
  ${chalk.green('branch')}     Branch release

${chalk.bold('OPTIONS:')}
  ${chalk.yellow('-h, --help')}        Show this help message
  ${chalk.yellow('--info')}            Show version and configuration info
  ${chalk.yellow('-v, --version')}     Show version number
  ${chalk.yellow('-f, --filter')} <pkg>     Filter packages by name/path
  ${chalk.yellow('-c, --config')} <path>    Path to config file
  ${chalk.yellow('-t, --tag-prefix')} <prefix> Tag prefix
  ${chalk.yellow('--dry-run')}         Show what would be done without executing
  ${chalk.yellow('--no-verify')}      Skip git pre-commit hooks

${chalk.bold('EXAMPLES:')}
  ${chalk.cyan('bump patch')}                    Bump patch version
  ${chalk.cyan('bump minor --dry-run')}         Preview minor version bump
  ${chalk.cyan(
    'bump major -f core',
  )}           Bump major version for 'core' package
  ${chalk.cyan('bump prerelease -c my.config.ts')} Use custom config file

${chalk.bold('REPOSITORY:')}
  ${chalk.blue('https://github.com/Innei/bump-version')}
`)
}

export async function showInfo() {
  try {
    // Read package.json to get version
    const packageJsonPath = join(process.cwd(), 'package.json')
    let version = 'unknown'

    try {
      // Try to find the package.json in the CLI package
      const cliPackageJson = JSON.parse(
        readFileSync(join(__dirname, '../../package.json'), 'utf-8'),
      )
      version = cliPackageJson.version
    } catch {
      // Fallback: try current directory
      try {
        const localPackageJson = JSON.parse(
          readFileSync(packageJsonPath, 'utf-8'),
        )
        if (localPackageJson.name === 'nbump') {
          version = localPackageJson.version
        }
      } catch {
        // Keep version as 'unknown'
      }
    }

    console.info(`
${chalk.bold.blue('nbump')} ${chalk.green(`v${version}`)}

${chalk.bold('System Information:')}
  ${chalk.gray('Node.js:')}     ${process.version}
  ${chalk.gray('Platform:')}    ${process.platform} ${process.arch}
  ${chalk.gray('Working Dir:')} ${process.cwd()}

${chalk.bold('Configuration:')}`)

    try {
      const config = await resolveConfig()
      const configEntries = Object.entries(config)
        .filter(([key]) => !['packages'].includes(key)) // Hide complex arrays
        .slice(0, 10) // Limit output

      configEntries.forEach(([key, value]) => {
        const displayValue =
          typeof value === 'object'
            ? JSON.stringify(value).slice(0, 50) +
              (JSON.stringify(value).length > 50 ? '...' : '')
            : String(value)
        console.info(
          `  ${chalk.gray(key.padEnd(15))} ${chalk.white(displayValue)}`,
        )
      })

      if (config.packages && config.packages.length > 0) {
        console.info(
          `  ${chalk.gray('packages'.padEnd(15))} ${chalk.white(
            `[${config.packages.length} items]`,
          )}`,
        )
      }
    } catch (error) {
      console.info(
        `  ${chalk.red('Failed to load configuration:')} ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    }

    console.info(`
${chalk.bold('Repository:')}
  ${chalk.blue('https://github.com/Innei/bump-version')}
`)
  } catch (error) {
    console.error(
      `${chalk.red('Error displaying info:')} ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
    process.exit(1)
  }
}
