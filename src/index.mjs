import { join } from 'path'
import { chalk, $ } from 'zx'

import { readFileSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import semver from 'semver'

import './error-handle.mjs'

const PKG_PATH = join(String(process.cwd()), '/package.json')
const originFile = readFileSync(PKG_PATH, 'utf-8')
const PKG = JSON.parse(originFile)

const beforeHooks = PKG.bump?.before || []
const afterHooks = PKG.bump?.after || []

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

  writeFileSync(PKG_PATH, JSON.stringify(PKG, null, 2))

  console.log(chalk.green('Running after hooks.'))
  try {
    await execCmd(afterHooks)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(PKG_PATH, originFile)
  }
}

main()
