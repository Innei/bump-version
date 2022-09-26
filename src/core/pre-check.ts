import { chalk } from 'zx'
import { getPackageJson, releaseTypes, getNextVersion } from '../utils/pkg.js'
import { resolveArgs } from './resolve-args.js'
import { run } from './run.js'
import inquirer from 'inquirer'
import type { ReleaseType } from 'semver'

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
        if (result === 'y' && !result) {
          run(nextVersion)
        } else {
          process.exit(0)
        }
      })
  }
}
