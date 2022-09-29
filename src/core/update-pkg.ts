import inquirer from 'inquirer'
import { chalk, fs, globby, path } from 'zx'

import { ROOT_WORKSPACE_DIR } from '../constants/path.js'
import { getPackageJson, getRootPackageJson } from '../utils/pkg.js'
import { resolveArgs } from './resolve-args.js'
import { resolveConfig } from './resolve-config.js'

export const updatePackageJsonVersion = async (newVersion: string) => {
  const { dryRun: dryMode } = resolveArgs()
  const { mode, packages } = resolveConfig()

  switch (mode) {
    case 'independent': {
      const { json, tabIntent, path } = getPackageJson()

      !dryMode &&
        (await fs.writeJson(
          path,
          { ...json, version: newVersion },
          {
            spaces: tabIntent || 2,
          },
        ))
      break
    }
    case 'monorepo': {
      const { json, path: rootPkgPath, tabIntent } = getRootPackageJson()
      const rootVersion = json.version

      const paths = await globby(
        packages.map((pkg) => path.resolve(ROOT_WORKSPACE_DIR, pkg)),
        {
          absolute: true,
          onlyDirectories: true,
          unique: true,
        },
      )

      console.log(
        `${chalk.cyan(json.name)}  ${rootVersion} -> ${chalk.green(
          newVersion,
        )}`,
      )

      const bumpFnRefs: (() => Promise<void>)[] = []

      await Promise.all(
        paths.map(async (monorepoPath) => {
          const monorepoPkgPath = path.resolve(monorepoPath, 'package.json')
          const monorepoPkg = await fs
            .readJson(monorepoPkgPath, 'utf-8')
            .catch((er) => {})

          if (!monorepoPkg || !monorepoPkg.version) {
            return
          }

          const monorepoName: string =
            monorepoPkg.name ||
            monorepoPath.replace(new RegExp(`^${ROOT_WORKSPACE_DIR}`), '')

          console.log(
            `${' '.repeat(4)}${monorepoName.padEnd(15, ' ')}${
              monorepoPkg.version
            } -> ${chalk.yellow(newVersion)}`,
          )

          bumpFnRefs.push(async () => {
            !dryMode &&
              fs.writeJson(monorepoPkgPath, {
                ...monorepoPkg,
                version: newVersion,
              })
          })
        }),
      )

      const result = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Confirm update all monorepo packages version?',
        default: true,
      })
      if (result['confirm']) {
        await Promise.all(bumpFnRefs.map((fn) => fn()))

        !dryMode &&
          (await fs.writeJson(
            rootPkgPath,
            { ...json, version: newVersion },
            {
              spaces: tabIntent || 2,
            },
          ))
      } else {
        process.exit(0)
      }
    }
  }
}
