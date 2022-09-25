import { writeFileSync } from 'fs'
import inquirer from 'inquirer'
import semver from 'semver'
import { $, chalk, fs } from 'zx'
import type { BumpOptions } from '../interfaces/options.js'
import { camelcaseKeys } from '../utils/camelcase-keys.js'
import { getCurrentGitBranch } from '../utils/git.js'
import { getPackageJson } from '../utils/pkg.js'

import { generateChangeLog, isExistChangelogFile } from '../utils/changelog.js'
import { snakecase } from '../utils/snakecase.js'
import { resolve as pathResolve } from 'path'
const { valid, lte } = semver
type CmdContext = {
  nextVersion: string
}

export async function execCmd(cmds: string[], context: CmdContext) {
  const ctxKeys = Object.keys(context)
  for (const cmd of cmds) {
    const handledCmd = ctxKeys.reduce((key, nextKey) => {
      return cmd.replace(`$\{${snakecase(key).toUpperCase()}\}`, context[key])
    }, cmd)
    // @ts-ignore
    await $([handledCmd])
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
  const { json: PKG, originFile } = getPackageJson()
  const bumpOptions: Partial<BumpOptions> = camelcaseKeys(PKG.bump || {})
  // define options
  const leadingHooks = bumpOptions.leading || bumpOptions.before || []
  const taildingHooks =
    bumpOptions.trailing ||
    (bumpOptions as any).tailing ||
    bumpOptions.after ||
    []

  // npm
  const doPublish = bumpOptions.publish || false

  // git
  const createGitTag = bumpOptions.tag || true
  const doGitPush = bumpOptions.push || true
  const commitMessage = bumpOptions.commitMessage || 'release: v${NEW_VERSION}'
  const allowedBranches = bumpOptions.allowedBranches

  // changelog
  const shouldGenerateChangeLog = bumpOptions.changelog || false

  console.log(chalk.green('Running leading hooks.'))

  const cmdContext: CmdContext = {
    nextVersion: newVersion,
  }

  await execCmd(leadingHooks, cmdContext)
  const { json, tabIntent, path } = getPackageJson()
  json.version = newVersion
  writeFileSync(path, JSON.stringify(json, null, tabIntent || 2))

  console.log(chalk.green('Running tailing hooks.'))

  try {
    await execCmd(taildingHooks, cmdContext)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(path, originFile)

    process.exit(1)
  }
  const currentBranch = await getCurrentGitBranch()
  const isAllowedBranch = allowedBranches
    ? allowedBranches.some((regexpString) =>
        new RegExp(regexpString).test(currentBranch),
      )
    : ['master', 'main'].includes(currentBranch)

  if (createGitTag && isAllowedBranch) {
    console.log(chalk.green('Creating git tag.'))
    await $`git add package.json`
    await $`git commit -a -m "${commitMessage.replace(
      '${NEW_VERSION}',
      newVersion,
    )}"`
    await $`git tag -a v${newVersion} -m "Release v${newVersion}"`

    // TODO

    if (shouldGenerateChangeLog) {
      const changelog = await generateChangeLog()

      const hasExistChangeFile = isExistChangelogFile()
      let changelogPath = ''
      if (hasExistChangeFile) {
        changelogPath = pathResolve(process.cwd(), hasExistChangeFile)
        fs.unlinkSync(changelogPath)
      }
      // TODO custom changelog filename
      // fs.unlinkSync('CHANGELOG.md')
      writeFileSync(
        changelogPath || pathResolve(process.cwd(), 'CHANGELOG'),
        changelog,
      )

      await $`git commit --amend --no-edit`
    }

    if (doGitPush) {
      console.log(chalk.green('Pushing to remote.'))
      await $`git push`
      await $`git push --tags`
    }
  }

  if (doPublish) {
    console.log(chalk.green('Publishing to npm.'))
    await $`npm publish --access=public`
  }
}
