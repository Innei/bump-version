import { chalk, question } from 'zx'
import { getPackageJson, releaseTypes, getNextVersion } from './pkg.js'
import { resolveArgs } from './resolve-args.js'
import { run } from './run.js'

export const precheck = () => {
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
  const isReleaseType = keys.find(
    (key) => args[key] && releaseTypes.includes(key),
  )

  if (isReleaseType) {
    const nextVersion = getNextVersion(currentVersion, isReleaseType)

    console.log(
      `Current version: ${currentVersion}, New version: ${nextVersion}`,
    )

    question('Continue? (Y/n) ', {
      choices: ['y', 'n'],
    }).then((answer) => {
      if (answer === 'y' && !answer) {
        run(nextVersion)
      } else {
        process.exit(0)
      }
    })
  }
}
