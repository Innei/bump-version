import { writeFileSync } from 'fs'
import inquirer from 'inquirer'
import { join as pathJoin } from 'path'
import semver from 'semver'
import { $, cd, chalk, fs } from 'zx'

import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from '../constants/path.js'
import { generateChangeLog, isExistChangelogFile } from '../utils/changelog.js'
import { detectPackage } from '../utils/detect-package.js'
import { getCurrentGitBranch, gitPushWithUpstream } from '../utils/git.js'
import { memoedPackageJson } from '../utils/pkg.js'
import { snakecase } from '../utils/snakecase.js'
import { context } from './context.js'
import { dryRun } from './dry-run.js'
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
  const nextVersion = answers.customVersion.replace(/^v/, '').trim()

  const currentVersion = memoedPackageJson.json.version

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

  return runBump(nextVersion)
}

export async function runBump(newVersion: string) {
  const { originFile } = memoedPackageJson
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
    mode,

    overrideChangelogOptions,
  } = resolveConfig()
  const isMonorepo = mode === 'monorepo'
  const { dryRun: dryMode, tagPrefix: tagPrefixArgs, noVerify } = resolveArgs()
  const nextTagPrefix = tagPrefixArgs || tagPrefix

  // check allowed branches
  const currentBranch = await getCurrentGitBranch()
  const defaultAllowedBranches: string[] = ['main', 'master']
  if (__DEV__) {
    defaultAllowedBranches.push('test', 'dev')
  }
  const isAllowedBranch = allowedBranches
    ? allowedBranches.some((options) => {
        let name: string
        let thisIsCurrentBranchName: boolean

        if (typeof options !== 'string') {
          name = options.name

          const { allowTypes, disallowTypes } = options

          thisIsCurrentBranchName = new RegExp(name).test(currentBranch)

          // 0. skip if release type is undefined, custom version
          // eslint-disable-next-line no-empty
          if (typeof context.selectedReleaseType === 'undefined') {
          }
          // 1. check disallowTypes
          else if (disallowTypes?.length && thisIsCurrentBranchName) {
            const isDisallowed = disallowTypes.some((type) => {
              return context.selectedReleaseType === type
            })

            if (isDisallowed) {
              console.error(
                chalk.red(
                  `The version you entered is not allowed to be released on the current branch, selected release type is ${
                    context.selectedReleaseType
                  }, disallow types: ${disallowTypes.join(',')}`,
                ),
              )

              process.exit(-2)

              // 2. then check allowTypes
            }
          } else if (allowTypes?.length && thisIsCurrentBranchName) {
            const isAllowed = allowTypes.some((type) => {
              return context.selectedReleaseType === type
            })

            if (!isAllowed) {
              console.log(
                chalk.red(
                  `The version you entered is not allowed to be released on the current branch, selected release type is ${context.selectedReleaseType},`,
                  `allowed types: ${allowTypes.join(', ')}`,
                ),
              )

              process.exit(-2)
            }
          }
        } else {
          name = options
          thisIsCurrentBranchName = new RegExp(name).test(currentBranch)
        }

        return thisIsCurrentBranchName
      })
    : defaultAllowedBranches.includes(currentBranch)

  if (noVerify) {
    console.log(
      chalk.yellow(
        'You are running in no-verify mode. Skip verify which branch can bump.',
      ),
    )
  } else if (!isAllowedBranch) {
    console.log(
      chalk.red(
        `Current branch ${currentBranch} is not allowed to release. ${(
          allowedBranches.map((br) => (typeof br == 'string' ? br : br.name)) ||
          defaultAllowedBranches
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

  const { path } = memoedPackageJson
  await updatePackageJsonVersion(newVersion)

  console.log(chalk.green('Running tailding hooks.'))

  try {
    await execCmd(taildingHooks, cmdContext)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(path, originFile)

    process.exit(1)
  }

  console.log(chalk.green('Creating git tag.'))
  await dryRun`git add package.json`
  await dryRun`git commit -a -m ${commitMessage.replace(
    '${NEW_VERSION}',
    newVersion,
  )} --no-verify`

  if (createGitTag) {
    await $`git tag -a ${nextTagPrefix + newVersion} -m "Release ${
      nextTagPrefix + newVersion
    }"`
  }

  if (shouldGenerateChangeLog) {
    const changelog = await generateChangeLog({
      tagPrefix: nextTagPrefix,
      ...overrideChangelogOptions,
    })

    const hasExistChangeFile = isExistChangelogFile()
    const defaultChangelogFilename = 'CHANGELOG.md'
    let changelogFilename = defaultChangelogFilename

    const changelogInFolder = isMonorepo ? ROOT_WORKSPACE_DIR : WORKSPACE_DIR
    let changelogPath = pathJoin(changelogInFolder, changelogFilename)
    if (hasExistChangeFile) {
      // FIXME
      changelogFilename = hasExistChangeFile
      changelogPath = pathJoin(changelogInFolder, changelogFilename)
      !dryMode && fs.unlinkSync(changelogPath)
    }

    if (dryMode) {
      console.log(`changelog generate: \n`, changelog)
      console.log(`changelog location: \n`, changelogPath)
    } else {
      // TODO custom changelog filename

      console.log(chalk.green('Generating changelog.'))
      writeFileSync(changelogPath, changelog)
      await dryRun`git add ${changelogPath}`
      await dryRun`git commit --amend --no-verify --no-edit`

      if (createGitTag) {
        await $`git tag -d ${nextTagPrefix + newVersion}`.quiet().nothrow()
        await dryRun`git tag -a ${nextTagPrefix + newVersion} -m "Release ${
          nextTagPrefix + newVersion
        }"`
      }
    }
  }

  if (dryMode && createGitTag) {
    await $`git tag -d ${nextTagPrefix + newVersion}`.nothrow().quiet()
  }

  if (doGitPush) {
    console.log(chalk.green('Pushing to remote.'))
    await gitPushWithUpstream()
    createGitTag && (await dryRun`git push --tags`)
  }

  if (doPublish) {
    if (!isMonorepo) {
      // should do publish in workdir
      cd(WORKSPACE_DIR)
    }

    const packageManager = await detectPackage()
    let publishCommand = `${packageManager} publish --access public`
    if (packageManager === 'pnpm' && isMonorepo) {
      publishCommand += ' -r'
    }
    console.log(chalk.green('Publishing to npm.'))
    // @ts-ignore
    await dryRun([publishCommand])
  }

  process.exit(0)
}
