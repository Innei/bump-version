import inquirer from 'inquirer'
import semver from 'semver'
import { chalk } from 'zx'

import type { ReleaseType } from 'semver'

import {
  getBranchVersion,
  getCurrentGitBranch,
  isMainBranch,
} from '../utils/git.js'
import { memoedPackageJson } from '../utils/pkg.js'
import { getIdentifier, nextIdentifierMap } from '../utils/version.js'
import { context } from './context.js'
import { resolveConfig } from './resolve-config.js'
import { cutsomVersionRun, runBump } from './run.js'
import { generateReleaseTypes } from './version.js'

export const promptMain = async () => {
  const packageJson = memoedPackageJson
  const currentVersion = packageJson.json.version as string
  const identifier = getIdentifier(currentVersion)

  const nextReleaseType = new Set([
    'patch',
    'minor',
    'major',

    'premajor',
    'preminor',
    'prepatch',
    'prerelease',
  ])

  const { allowedBranches } = await resolveConfig()

  if (allowedBranches) {
    const currentGitBranch = await getCurrentGitBranch()
    for (const branch of allowedBranches) {
      if (typeof branch === 'string') {
        // do nothing
      } else {
        const thisIsCurrentBranchName = new RegExp(branch.name).test(
          currentGitBranch,
        )
        if (!thisIsCurrentBranchName) {
          continue
        }
        const { allowTypes, disallowTypes } = branch

        // 1. check allow types

        if (typeof allowTypes != 'undefined' && allowTypes.length) {
          nextReleaseType.clear()

          for (const type of allowTypes) {
            nextReleaseType.add(type)
          }
          // 2. check disallow types
        } else if (
          typeof disallowTypes != 'undefined' &&
          disallowTypes.length
        ) {
          for (const type of disallowTypes) {
            nextReleaseType.delete(type)
          }
        }
      }
    }
  }

  const selectItems = (await generateReleaseTypes(
    currentVersion,
    undefined,
    identifier,
    Array.from(nextReleaseType) as any[],
  )) as any[]

  if (identifier) {
    const nextIdentifier = nextIdentifierMap[identifier]

    if (nextIdentifier) {
      const nextVersion = semver.inc(
        currentVersion,
        'prerelease',
        nextIdentifier,
      )
      selectItems.push({
        name: `${nextIdentifier} - ${nextVersion}`,
        value: nextVersion,

        extra: {
          releaseType: 'prerelease',
          pried: nextIdentifier,
        },
      })
    }
  }

  if (!(await isMainBranch())) {
    const { branchVersion, slugifyTagName } = await getBranchVersion(
      currentVersion,
    )
    selectItems.push({
      name: `branch version - ${branchVersion}`,
      value: branchVersion,

      extra: {
        releaseType: 'branch',
        pried: slugifyTagName,
      },
    })

    // hash version

    // if (!(await isMainBranch())) {
    //   const branchName = await getCurrentGitBranch()
    //   const slugifyTagName = slugify.default(branchName.replace(/\//g, '-'))
    //   const hash = await getGitHeadShortHash()
    //   const privateVersion = `${semver.inc(
    //     currentVersion,
    //     'patch',
    //   )}-${slugifyTagName}+${hash}`
    //   selectItems.push({
    //     name: `hash version - ${privateVersion}`,
    //     value: privateVersion,
    //   })
    // }
  }

  selectItems.push({
    value: 'Custom Version',
    extra: {},
  })

  console.log(chalk.green(`Which version would you like to bump it?`))
  console.log(`Current version: ${currentVersion}`)

  const answer = await inquirer.prompt({
    name: 'nextVersion',
    message: 'Select a version',
    type: 'list',
    pageSize: selectItems.length,

    choices: [...selectItems],
  })

  // TODO refactor
  const nextVersion2RawMap = new Map<
    string,
    {
      releaseType: ReleaseType
      pried: string
    }
  >()

  for (const item of selectItems as any) {
    nextVersion2RawMap.set(item.value, item.extra)
  }

  const nextVersionExtra = nextVersion2RawMap.get(answer.nextVersion)

  context.selectedReleaseType = nextVersionExtra?.releaseType
  context.selectedVersion = answer.nextVersion
  context.selectedPried = nextVersionExtra?.pried

  if (answer.nextVersion === 'Custom Version') {
    cutsomVersionRun()
  } else {
    runBump(answer.nextVersion)
  }
}
