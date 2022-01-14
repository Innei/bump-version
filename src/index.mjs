// @ts-check
import { join } from 'path'
import { chalk, $ } from 'zx'

import { readFileSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import semver from 'semver'

import './error-handle.mjs'

const PKG_PATH = join(String(process.cwd()), '/package.json')
const originFile = readFileSync(PKG_PATH, 'utf-8')
const tabIntent = originFile.match(/^\s+/)?.length
const PKG = JSON.parse(originFile)

const beforeHooks = PKG.bump?.before || []
const afterHooks = PKG.bump?.after || []
const doPublish = PKG.bump?.publish || false
const createGitTag = PKG.bump?.tag || true

const doGitPush = PKG.bump?.push || true

const releaseTypes = [
  'patch',
  'minor',
  'major',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]

function generateReleaseTypes(currentVersion, types, pried = 'alpha') {
  return types.map((item) => {
    let version = semver.inc(currentVersion, item, pried)
    return {
      name: `${item} - ${version}`,
      value: version,
    }
  })
}

/**
 *
 * @param {string[]} cmds
 */
async function execCmd(cmds) {
  for (const cmd of cmds) {
    await $([cmd])
  }
}

async function main() {
  if (!PKG.version) {
    console.error('can not find package.json version field.')
    return
  }
  console.log(chalk.yellow('Current Version: ' + PKG.version))

  const { version: newVersion } = await inquirer.prompt({
    type: 'list',
    name: 'version',
    message: 'Which version would you like to bump it? ',
    choices: generateReleaseTypes(PKG.version, releaseTypes),
  })

  PKG.version = newVersion
  console.log(chalk.green('Running before hooks.'))

  await execCmd(beforeHooks)

  writeFileSync(PKG_PATH, JSON.stringify(PKG, null, tabIntent || 2))

  console.log(chalk.green('Running after hooks.'))
  try {
    await execCmd(afterHooks)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(PKG_PATH, originFile)

    process.exit(1)
  }

  const branch = await $`git rev-parse --abbrev-ref HEAD`
  const isMasterBranch = ['master', 'main'].includes(branch.stdout.trim())

  if (createGitTag && isMasterBranch) {
    console.log(chalk.green('Creating git tag.'))
    await $`git add .`
    await $`git commit -a -m "release: ${newVersion}"`
    await $`git tag -a ${newVersion} -m "Release ${newVersion}"`
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

main()
