import { writeFileSync } from 'fs'
import inquirer from 'inquirer'
import { join as pathJoin } from 'path'
import semver from 'semver'
import { $, chalk, fs } from 'zx'

import { WORKSPACE_DIR } from '../constants/path.js'
import { generateChangeLog, isExistChangelogFile } from '../utils/changelog.js'
import { detectPackage } from '../utils/detect-package.js'
import { getCurrentGitBranch } from '../utils/git.js'
import { getPackageJson } from '../utils/pkg.js'
import { dryRun } from '../utils/run.js'
import { snakecase } from '../utils/snakecase.js'
import { resolveArgs } from './resolve-args.js'
import { resolveConfig } from './resolve-config.js'
import { updatePackageJsonVersion } from './update-pkg.js'

const { valid, lte } = semver

type CmdContext = {
  nextVersion: string
}

export async function execCmd(cmds: string[], context: CmdContext) {
  const ctxKeys = Object.keys(context)
  for (const cmd of cmds) {
    const handledCmd = ctxKeys.reduce((cmd, nextKey) => {
      return cmd.replace(
        `$\{${snakecase(nextKey).toUpperCase()}}`,
        context[nextKey],
      )
    }, cmd)
    // @ts-ignore
    await dryRun([handledCmd])
  }
}

export async function cutsomVersionRun() {
  const answers = await inquirer.prompt({
    name: 'customVersion',
    message: 'Enter a custom version',
    validate(input) {
      if (!input) {
        return 'Please enter a custom version'
      }
      return valid(input) ? true : 'Please enter a valid version'
    },
  })
  const nextVersion = answers.customVersion.trim()

  const currentVersion = getPackageJson().json.version

  if (lte(nextVersion, currentVersion)) {
    console.log(
      chalk.red(
        `The version you entered is less than or equal to the current version`,
      ),
    )
    process.exit(-1)
  }
  const confirm = await inquirer.prompt({
    type: 'confirm',
    message: `${currentVersion} -> ${chalk.green(nextVersion)}, confirm?`,
    default: true,
    name: 'confirm',
  })

  if (!confirm) {
    process.exit(0)
  }

  return run(nextVersion)
}

export async function run(newVersion: string) {
  const { originFile } = getPackageJson()
  const {
    allowedBranches,
    commitMessage,
    createGitTag,
    doGitPush,
    doPublish,
    leadingHooks,
    shouldGenerateChangeLog,
    taildingHooks,
    tagPrefix,
  } = resolveConfig()
  const { dryRun: dryMode, tagPrefix: tagPrefixArgs } = resolveArgs()
  const nextTagPrefix = tagPrefixArgs || tagPrefix

  // check allowed branches
  const currentBranch = await getCurrentGitBranch()
  const defaultAllowedBranches: string[] = ['main', 'master']
  if (__DEV__) {
    defaultAllowedBranches.push('test', 'dev')
  }
  const isAllowedBranch = allowedBranches
    ? allowedBranches.some((regexpString) =>
        new RegExp(regexpString).test(currentBranch),
      )
    : defaultAllowedBranches.includes(currentBranch)

  if (!isAllowedBranch) {
    console.log(
      chalk.red(
        `Current branch ${currentBranch} is not allowed to release. ${(
          allowedBranches || defaultAllowedBranches
        )
          .map((b) => chalk.green(b))
          .join(', ')} is allowed.`,
      ),
    )

    process.exit(-2)
  }

  console.log(chalk.green('Running leading hooks.'))

  const cmdContext: CmdContext = {
    nextVersion: newVersion,
  }

  await execCmd(leadingHooks, cmdContext)

  const { path } = getPackageJson()
  await updatePackageJsonVersion(newVersion)

  console.log(chalk.green('Running tailding hooks.'))

  try {
    await execCmd(taildingHooks, cmdContext)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(path, originFile)

    process.exit(1)
  }

  if (createGitTag) {
    console.log(chalk.green('Creating git tag.'))
    await dryRun`git add package.json`
    await dryRun`git commit -a -m ${commitMessage.replace(
      '${NEW_VERSION}',
      newVersion,
    )} --no-verify`
    await $`git tag -a ${nextTagPrefix + newVersion} -m "Release ${
      nextTagPrefix + newVersion
    }"`

    // TODO

    if (shouldGenerateChangeLog) {
      const changelog = await generateChangeLog({
        tagPrefix: nextTagPrefix,
      })

      const hasExistChangeFile = isExistChangelogFile()
      const defaultChangelogFilename = 'CHANGELOG'
      let changelogFilename = defaultChangelogFilename

      let changelogPath = pathJoin(WORKSPACE_DIR, defaultChangelogFilename)
      if (hasExistChangeFile) {
        // FIXME
        changelogFilename = hasExistChangeFile
        changelogPath = pathJoin(WORKSPACE_DIR, hasExistChangeFile)
        !dryMode && fs.unlinkSync(changelogPath)
      }

      if (dryMode) {
        console.log(`changelog generate: \n`, changelog)
        console.log(`changelog location: \n`, changelogPath)
      } else {
        // TODO custom changelog filename
        // fs.unlinkSync('CHANGELOG.md')
        writeFileSync(changelogPath, changelog)
        await dryRun`git add ${changelogFilename}`
        await dryRun`git commit --amend --no-verify --no-edit`
        await $`git tag -d ${nextTagPrefix + newVersion}`
        await dryRun`git tag -a ${nextTagPrefix + newVersion} -m "Release ${
          nextTagPrefix + newVersion
        }"`
      }
    }

    if (dryMode) {
      await $`git tag -d ${nextTagPrefix + newVersion}`.nothrow()
    }

    if (doGitPush) {
      console.log(chalk.green('Pushing to remote.'))
      await dryRun`git push`
      await dryRun`git push --tags`
    }
  }

  if (doPublish) {
    const packageManager = await detectPackage()
    const publishCommand = `${packageManager} publish --access public`
    console.log(chalk.green('Publishing to npm.'))
    // @ts-ignore
    await dryRun([publishCommand])
  }
}
