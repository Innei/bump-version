import type {
  AsyncDynamicQuestionProperty,
  DistinctChoice,
  ListChoiceMap,
} from 'inquirer'
import inquirer from 'inquirer'
import semver from 'semver'
import { chalk } from 'zx'

import { getBranchVersion, isMainBranch } from '../utils/git.js'
import { generateReleaseTypes, getPackageJson } from '../utils/pkg.js'
import { getIdentifier, nextIdentifierMap } from '../utils/version.js'
import { context } from './context.js'
import { cutsomVersionRun, run } from './run.js'

export const promptMain = async () => {
  const packageJson = getPackageJson()
  const currentVersion = packageJson.json.version as string
  const identifier = getIdentifier(currentVersion)

  const selectItems: AsyncDynamicQuestionProperty<
    DistinctChoice<any, ListChoiceMap<any>>[],
    any
  > = generateReleaseTypes(currentVersion, undefined, identifier)

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
        releaseType: 'prerelease',
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
      releaseType: string
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
    run(answer.nextVersion)
  }
}
