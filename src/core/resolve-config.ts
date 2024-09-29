import { loadConfig } from 'c12'
import { fs, path } from 'zx'
import type { BumpConfig, ChangelogOptions } from '../interfaces/options.js'

import { ROOT_WORKSPACE_DIR, WORKSPACE_DIR } from '../constants/path.js'
import { camelcaseKeys } from '../utils/camelcase-keys.js'
import { memoReturnValueAsyncFunction } from '../utils/memo.js'
import { resolveArgs } from './resolve-args.js'

const checkCustomConfigExist = () => {
  const { configPath } = resolveArgs()

  if (configPath) {
    const customRcFilePath = path.resolve(ROOT_WORKSPACE_DIR, configPath)
    if (fs.existsSync(customRcFilePath)) {
      return customRcFilePath
    } else {
      throw new ReferenceError(
        `The custom config file path you entered does not exist: ${customRcFilePath}`,
      )
    }
  }
}

const wrapHookArray = (hook) => {
  if (typeof hook == 'string') {
    return [hook]
  }

  if (Array.isArray(hook)) {
    return hook
  }

  throw new TypeError(`Invalid hook type: ${typeof hook}`)
}

export const resolveConfig = memoReturnValueAsyncFunction(async () => {
  let bumpOptions: Partial<BumpConfig>

  const rcPath = checkCustomConfigExist()

  if (rcPath) {
    const { config } = await loadConfig<Partial<BumpConfig>>({
      configFile: rcPath,
    })

    bumpOptions = camelcaseKeys(config)
  } else {
    // load from current workspace

    const { config } = await loadConfig<Partial<BumpConfig>>({
      cwd: WORKSPACE_DIR,
      name: 'bump',
      packageJson: true,
    })
    bumpOptions = camelcaseKeys(config)
  }

  if (__DEV__) {
    console.log(bumpOptions)
  }

  // define options
  const leadingHooks = wrapHookArray(
    bumpOptions.leading || bumpOptions.before || [],
  )
  const taildingHooks = wrapHookArray(
    bumpOptions.trailing ||
      (bumpOptions as any).tailing ||
      bumpOptions.after ||
      [],
  )

  // npm
  const doPublish = bumpOptions.publish ?? false

  // git
  const createGitTag = bumpOptions.tag ?? true
  const doGitPush = bumpOptions.push ?? true
  const commitMessage = bumpOptions.commitMessage || 'release: v${NEW_VERSION}'
  const allowedBranches = bumpOptions.allowedBranches ?? ['main', 'master']
  const tagPrefix = bumpOptions.tagPrefix || 'v'
  const withTags = bumpOptions.withTags ?? false
  const remoteTags = bumpOptions.remoteTags ?? false

  // changelog
  const isChangelogOptions = typeof bumpOptions.changelog === 'object'
  const shouldGenerateChangeLog = isChangelogOptions
    ? (bumpOptions.changelog as ChangelogOptions).enable
    : bumpOptions.changelog ?? false
  const overrideChangelogOptions = isChangelogOptions
    ? bumpOptions.changelog
    : {}

  // monorepo
  const mode = bumpOptions.mode || 'independent'
  const packages = bumpOptions.packages || []

  const allowDirty = bumpOptions.allowDirty ?? false
  const commit = bumpOptions.commit ?? true

  return {
    leadingHooks,
    taildingHooks,
    doPublish,
    createGitTag,
    doGitPush,
    commitMessage,
    allowedBranches,
    shouldGenerateChangeLog,
    tagPrefix,
    mode,
    packages,
    withTags,
    remoteTags,
    allowDirty,
    commit,
    // extra
    overrideChangelogOptions,
  }
})
