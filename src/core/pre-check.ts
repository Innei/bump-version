import fs from 'node:fs'
import path from 'node:path'
import inquirer from 'inquirer'
import { $, chalk } from 'zx'
import type { ReleaseType } from 'semver'

import { version } from '../../package.json'
import {
  fetchGitRemoteTags,
  getBranchVersion,
  getGitSemVerTags,
  getLatestGitTag,
  hasCommitBeforeTag,
} from '../utils/git.js'
import {
  getNextVersion,
  memoedPackageJson,
  releaseTypes,
} from '../utils/pkg.js'
import { getNextVersionWithTags } from '../utils/version.js'
import { context } from './context.js'
import { resolveArgs } from './resolve-args.js'
import { resolveConfig } from './resolve-config.js'
import { runBump } from './run.js'

export const precheck = async () => {
  const args = resolveArgs()
  const config = await resolveConfig()

  if (typeof args.v == 'boolean' && args.v) {
    console.info(version)

    process.exit(0)
  }

  // check git tree is clean
  if (!config.allowDirty) {
    {
      const result = await $`git status --porcelain`.quiet()
      if (result.stdout && !__DEV__) {
        console.error(chalk.red('The git tree is not clean'))
        process.exit(-1)
      }
    }
  }

  if (config.createGitTag) {
    const latestTag = await getLatestGitTag().catch(() => null)

    if (latestTag) {
      const hasCommitBetween = await hasCommitBeforeTag(latestTag)

      if (!hasCommitBetween) {
        const { confirm } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `The latest tag is ${latestTag}, but there is no commit between the latest tag and the current commit, do you want to continue?`,
          default: false,
        })

        if (!confirm) {
          return process.exit(0)
        }
      }
    }
  }

  const currentVersion = memoedPackageJson.json.version

  if (!currentVersion) {
    console.error(
      chalk.red(`Not a valid package.json file, can't find version.`),
    )
    process.exit(-1)
  }

  context.currentVersion = currentVersion

  if (args.dryRun) {
    console.warn(chalk.yellow(`Dry run mode. Will not exec commands.`))
    __DEV__ && console.info(args)
  }

  if (config.mode === 'monorepo') {
    if (config.packages.length === 0) {
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
  const releaseType: ReleaseType = keys.find(
    (key) =>
      args[key] && [...releaseTypes, 'branch'].includes(key as ReleaseType),
  ) as any

  if (releaseType) {
    const { branchVersion } = await getBranchVersion(currentVersion)

    if (config.withTags && config.remoteTags) {
      await fetchGitRemoteTags()
    }
    const nextVersion =
      (releaseType as any) === 'branch'
        ? branchVersion
        : config.withTags
          ? getNextVersionWithTags({
              currentVersion,
              releaseType,
              tags: await getGitSemVerTags(),
            })
          : getNextVersion(currentVersion, releaseType)

    console.info(
      `Current version: ${currentVersion}, New version: ${nextVersion}`,
    )

    // TODO
    context.selectedPried = 'alpha'
    context.selectedReleaseType = releaseType
    context.selectedVersion = nextVersion

    return inquirer
      .prompt({
        name: 'confirm',
        default: true,
        message: 'Continue?',
        type: 'confirm',
      })
      .then(async (answer) => {
        const result = answer.confirm

        if (result) {
          await runBump(nextVersion, currentVersion)
        }
        process.exit(0)
      })
  }
}
