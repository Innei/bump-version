import type {
  AsyncDynamicQuestionProperty,
  DistinctChoice,
  ListChoiceMap,
} from 'inquirer'
import inquirer from 'inquirer'
import { chalk } from 'zx'
import { getPackageJson, generateReleaseTypes } from '../utils/pkg.js'
import { run, cutsomVersionRun } from '../utils/run.js'

export const promptMain = async () => {
  const packageJson = getPackageJson()
  const currentVersion = packageJson.json.version

  const versions = generateReleaseTypes(currentVersion)

  const selectItems: AsyncDynamicQuestionProperty<
    readonly DistinctChoice<any, ListChoiceMap<any>>[],
    any
  > = versions.map((version) => ({
    value: version.value,
    name: version.name,
  }))
  // @ts-ignore
  selectItems.push({
    value: 'Custom Version',
  })

  console.log(chalk.green(`Which version would you like to bump it?`))
  console.log(`Current version: ${currentVersion}`)
  const answer = await inquirer.prompt({
    name: 'nextVersion',
    message: 'Select a version',
    type: 'list',
    choices: [...selectItems],
  })

  if (answer.nextVersion === 'Custom Version') {
    cutsomVersionRun()
  } else {
    run(answer.nextVersion)
  }
}
