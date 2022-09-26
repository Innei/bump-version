import { writeFileSync } from 'fs'
import inquirer from 'inquirer'
import semver from 'semver'
import { $, chalk, fs, nothrow } from 'zx'
import { getCurrentGitBranch } from '../utils/git.js'
import { getPackageJson } from '../utils/pkg.js'

import { join as pathJoin } from 'path'
import { WORKSPACE_DIR } from '../constants/path.js'
import { generateChangeLog, isExistChangelogFile } from '../utils/changelog.js'
import { dryRun } from '../utils/run.js'
import { snakecase } from '../utils/snakecase.js'
import { resolveConfig } from './resolve-config.js'
import { resolveArgs } from './resolve-args.js'

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
  } = resolveConfig()
  const { dryRun: dryMode } = resolveArgs()

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
  const { json, tabIntent, path } = getPackageJson()
  json.version = newVersion
  !dryMode && writeFileSync(path, JSON.stringify(json, null, tabIntent || 2))

  console.log(chalk.green('Running tailing hooks.'))

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
    )}`
    await $`git tag -a v${newVersion} -m "Release v${newVersion}"`

    // TODO

    if (shouldGenerateChangeLog) {
      const changelog = await generateChangeLog()

      if (dryMode) {
        console.log(`changelog generate: `, changelog)
      } else {
        const hasExistChangeFile = isExistChangelogFile()
        const defaultChangelogFilename = 'CHANGELOG'
        let changelogFilename = defaultChangelogFilename

        let changelogPath = pathJoin(WORKSPACE_DIR, defaultChangelogFilename)
        if (hasExistChangeFile) {
          // FIXME
          changelogFilename = hasExistChangeFile
          changelogPath = pathJoin(WORKSPACE_DIR, hasExistChangeFile)
          fs.unlinkSync(changelogPath)
        }
        // TODO custom changelog filename
        // fs.unlinkSync('CHANGELOG.md')
        writeFileSync(changelogPath, changelog)
        await dryRun`git add ${changelogFilename}`
        await dryRun`git commit --amend --no-edit`
        await $`git tag -d v${newVersion}`
        await dryRun`git tag -a v${newVersion} -m "Release v${newVersion}"`
      }
    }

    if (dryMode) {
      await nothrow($`git tag -d v${newVersion}`)
    }

    if (doGitPush) {
      console.log(chalk.green('Pushing to remote.'))
      await dryRun`git push`
      await dryRun`git push --tags`
    }
  }

  if (doPublish) {
    console.log(chalk.green('Publishing to npm.'))
    await dryRun`npm publish --access=public`
  }
}
