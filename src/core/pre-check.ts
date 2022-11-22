import fs from 'fs'
import inquirer from 'inquirer'
import path from 'path'
import type { ReleaseType } from 'semver'
import { $, chalk } from 'zx'

import { getBranchVersion } from '../utils/git.js'
import { getNextVersion, getPackageJson, releaseTypes } from '../utils/pkg.js'
import { context } from './context.js'
import { resolveArgs } from './resolve-args.js'
import { resolveConfig } from './resolve-config.js'
import { run } from './run.js'

export const precheck = async () => {
  const args = resolveArgs()
  const config = resolveConfig()

  if (typeof args.v == 'boolean' && args.v) {
    const pkg = fs.readFileSync(path.resolve(process.cwd(), `./package.json`), {
      encoding: 'utf-8',
    })
    console.log(JSON.parse(pkg).version)

    process.exit(0)
  }

  // check git tree is clean

  {
    const result = await $`git status --porcelain`.quiet()
    if (result.stdout && !__DEV__) {
      console.error(chalk.red('The git tree is not clean'))
      process.exit(-1)
    }
  }

  const packageJson = getPackageJson()
  const currentVersion = packageJson.json.version

  if (!currentVersion) {
    console.error(
      chalk.red(`Not a valid package.json file, can't find version.`),
    )
    process.exit(-1)
  }

  context.currentVersion = currentVersion

  if (args.dryRun) {
    console.warn(chalk.yellow(`Dry run mode. Will not exec commands.`))
    __DEV__ && console.log(args)
  }

  if (config.mode === 'monorepo') {
    if (!config.packages.length) {
      throw new ReferenceError(
        'packages is required in monorepo mode, please add packages paths in `packages` filed.',
      )
    }
    if (args.filter) {
      console.error(
        chalk.red(`\`-f\` \`--filter\` argv can't used in monorepo mode.`),
      )
      process.exit(3)
    }

    console.warn(
      chalk.yellow(`You are in monorepo mode, only root version will be read.`),
    )
  }

  const keys = Object.keys(args)
  const isReleaseType: ReleaseType = keys.find(
    (key) =>
      args[key] && [...releaseTypes, 'branch'].includes(key as ReleaseType),
  ) as any

  if (isReleaseType) {
    const { branchVersion } = await getBranchVersion(currentVersion)

    const nextVersion =
      (isReleaseType as any) === 'branch'
        ? branchVersion
        : getNextVersion(currentVersion, isReleaseType)

    console.log(
      `Current version: ${currentVersion}, New version: ${nextVersion}`,
    )

    // TODO
    context.selectedPried = 'alpha'
    context.selectedReleaseType =
      (isReleaseType as any) === 'branch' ? 'prerelease' : isReleaseType
    context.selectedVersion = nextVersion

    return inquirer
      .prompt({
        name: 'confirm',
        default: true,
        message: 'Continue?',
        type: 'confirm',
      })
      .then((answer) => {
        const result = answer.confirm

        if (result) {
          run(nextVersion)
        } else {
          process.exit(0)
        }
      })
  }
}
