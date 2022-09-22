import { generate } from 'changelogithub'
import { writeFileSync } from 'fs'
import { $, chalk, fs, nothrow } from 'zx'
import type { BumpOptions } from '../interfaces/options.js'
import { getPackageJson } from './pkg.js'

/**
 *
 * @param {string[]} cmds
 */
export async function execCmd(cmds) {
  for (const cmd of cmds) {
    // @ts-ignore
    await $([cmd])
  }
}

export async function run(newVersion: string) {
  const { json: PKG, originFile } = getPackageJson()
  const bumpOptions: Partial<BumpOptions> = PKG.bump || {}
  // define options
  const leadingHooks = bumpOptions.leading || bumpOptions.before || []
  const taildingHooks =
    bumpOptions.trailing ||
    (bumpOptions as any).tailing ||
    bumpOptions.after ||
    []
  const doPublish = bumpOptions.publish || false
  const createGitTag = bumpOptions.tag || true

  const doGitPush = bumpOptions.push || true

  const generateChangeLog = bumpOptions.changelog || false

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
    const data = fs.readFileSync('CHANGELOG') // read existing contents into data
    const fd = fs.openSync('CHANGELOG', 'w+')
    const buffer = Buffer.from(md)

    fs.writeSync(fd, buffer, 0, buffer.length, 0) // write new data
    fs.writeSync(fd, data, 0, data.length, buffer.length) // append old data
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

    await nothrow($`git add CHANGELOG`)
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
