import inquirer from 'inquirer'
import type { ReleaseType } from 'semver'
import { chalk, fs, path } from 'zx'

import { getNextVersion, getPackageJson, releaseTypes } from '../utils/pkg.js'
import { resolveArgs } from './resolve-args.js'
import { run } from './run.js'

export const precheck = async () => {
  const packageJson = getPackageJson()
  const currentVersion = packageJson.json.version

  if (!currentVersion) {
    console.error(
      chalk.red(`Not a valid package.json file, can't find version.`),
    )
    process.exit(-1)
  }

  const args = resolveArgs()

  if (args.dryRun) {
    console.warn(chalk.yellow(`Dry run mode. Will not exec commands.`))
    __DEV__ && console.log(args)
  }

  if (typeof args.v == 'boolean' && args.v) {
    const cwd = process.cwd()
    console.log(fs.readJSONSync(path.resolve(cwd, 'package.json')).version)

    process.exit(0)
  }

  const keys = Object.keys(args)
  const isReleaseType: ReleaseType = keys.find(
    (key) => args[key] && releaseTypes.includes(key as ReleaseType),
  ) as any

  if (isReleaseType) {
    const nextVersion = getNextVersion(currentVersion, isReleaseType)

    console.log(
      `Current version: ${currentVersion}, New version: ${nextVersion}`,
    )

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
