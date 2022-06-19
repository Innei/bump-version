#!env node
// @ts-check
import { join } from 'path'
import { chalk, $, argv, nothrow, fs } from 'zx'

import { openSync, readFileSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import semver from 'semver'
import './error-handle.mjs'
import { generate } from 'changelogithub'
if (
  argv?.['version'] ||
  argv?.['v'] ||
  ['v', 'version'].includes(argv?.['_'][0])
) {
  const json = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), {
      encoding: 'utf-8',
    }),
  )

  console.log(json.version)

  process.exit(0)
}

function getPackageJson() {
  const PKG_PATH = join(String(process.cwd()), '/package.json')
  const originFile = readFileSync(PKG_PATH, 'utf-8')
  const tabIntent = originFile.match(/^\s+/)?.length
  const PKG = JSON.parse(originFile)

  return { json: PKG, path: PKG_PATH, originFile, tabIntent }
}

/**
 *
 * @type {{json:Readonly<any>, originFile: Readonly<string>}}
 */
const { json: PKG, originFile } = getPackageJson()

const leadingHooks = PKG.bump?.leading || PKG.bump?.before || []
const taildingHooks = PKG.bump?.tailing || PKG.bump?.after || []
const doPublish = PKG.bump?.publish || false
const createGitTag = PKG.bump?.tag || true

const doGitPush = PKG.bump?.push || true

const generateChangeLog = PKG?.bump?.changelog || false

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
    // @ts-ignore
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

  console.log(chalk.green('Running leading hooks.'))

  await execCmd(leadingHooks)
  // const PKG = readFileSync(PKG_PATH, 'utf-8')
  const { json, tabIntent, path } = getPackageJson()
  json.version = newVersion
  writeFileSync(path, JSON.stringify(json, null, tabIntent || 2))

  console.log(chalk.green('Running tailing hooks.'))

  if (generateChangeLog) {
    const { md } = await generate({})
    await nothrow($`touch CHANGELOG`)
    var data = fs.readFileSync('CHANGELOG') //read existing contents into data
    var fd = fs.openSync('CHANGELOG', 'w+')
    var buffer = Buffer.from(md)

    fs.writeSync(fd, buffer, 0, buffer.length, 0) //write new data
    fs.writeSync(fd, data, 0, data.length, buffer.length) //append old data
    // or fs.appendFile(fd, data);
    fs.close(fd)
  }
  try {
    await execCmd(taildingHooks)
  } catch (e) {
    console.error(chalk.yellow('Hook running failed, rollback.'))

    writeFileSync(path, originFile)

    process.exit(1)
  }

  const branch = await $`git rev-parse --abbrev-ref HEAD`
  const isMasterBranch = ['master', 'main'].includes(branch.stdout.trim())

  if (createGitTag && isMasterBranch) {
    console.log(chalk.green('Creating git tag.'))
    await $`git add package.json`
    await $`git commit -a -m "release: v${newVersion}"`
    await $`git tag -a v${newVersion} -m "Release v${newVersion}"`
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
