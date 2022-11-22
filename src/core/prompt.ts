import type {
  AsyncDynamicQuestionProperty,
  DistinctChoice,
  ListChoiceMap,
} from 'inquirer'
import inquirer from 'inquirer'
import semver from 'semver'
import slugify from 'slugify'
import { chalk } from 'zx'

import { getCurrentGitBranch, isMainBranch } from '../utils/git.js'
import { generateReleaseTypes, getPackageJson } from '../utils/pkg.js'
import { cutsomVersionRun, run } from './run.js'

const nextIdentifierMap = {
  alpha: 'beta',
  beta: 'canary',
  canary: 'rc',
}

export const promptMain = async () => {
  const packageJson = getPackageJson()
  const currentVersion = packageJson.json.version as string
  const identifier = currentVersion.match(/\d+\.\d+\.\d+-(.*?)\.\d+/)?.[1]

  const versions = generateReleaseTypes(currentVersion, undefined, identifier)

  const selectItems: AsyncDynamicQuestionProperty<
    DistinctChoice<any, ListChoiceMap<any>>[],
    any
  > = versions.map((version) => ({
    value: version.value,
    name: version.name,
  }))

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
      })
    }
  }

  if (!(await isMainBranch())) {
    const branchName = await getCurrentGitBranch()
    const slugifyTagName = slugify.default(branchName.replace(/\//g, '-'))

    const privateVersion = `${semver.inc(
      currentVersion,
      'prerelease',
      slugifyTagName,
    )}`
    selectItems.push({
      name: `branch version - ${privateVersion}`,
      value: privateVersion,
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

  if (answer.nextVersion === 'Custom Version') {
    cutsomVersionRun()
  } else {
    run(answer.nextVersion, currentVersion)
  }
}
