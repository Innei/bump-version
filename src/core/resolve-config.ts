import { fs, path } from 'zx'

import {
  CONFIG_RC_PATH,
  ROOT_CONFIG_RC_PATH,
  ROOT_WORKSPACE_DIR,
} from '../constants/path.js'
import type { BumpConfig, ChangelogOptions } from '../interfaces/options.js'
import { camelcaseKeys } from '../utils/camelcase-keys.js'
import { getPackageJson, getRootPackageJson } from '../utils/pkg.js'
import { resolveArgs } from './resolve-args.js'

// FIXME: rc priority: 0. custom rc path 1. monorepo rc file 2. root rc file 3. monorepo package field 4. root package field
const checkConfigRcExist = () => {
  const { rcPath } = resolveArgs()

  if (rcPath) {
    const customRcFilePath = path.resolve(ROOT_WORKSPACE_DIR, rcPath)
    if (fs.existsSync(customRcFilePath)) {
      return customRcFilePath
    } else {
      throw new ReferenceError(
        `The custom rc file path you entered does not exist: ${customRcFilePath}`,
      )
    }
  }

  return fs.existsSync(CONFIG_RC_PATH)
    ? CONFIG_RC_PATH
    : fs.existsSync(ROOT_CONFIG_RC_PATH)
    ? ROOT_CONFIG_RC_PATH
    : false
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

const callOnceDev = (fn: (...args: any[]) => any) => {
  let called = false
  return (...args) => {
    if (!__DEV__) {
      return () => {}
    }
    if (!called) {
      called = true
      return fn.apply(this, args)
    }
  }
}

const logOption = callOnceDev((bumpOptions) =>
  console.log('bumpOptions', bumpOptions),
)

export const resolveConfig = () => {
  // FIXME monorepo read pkg json issue
  const { json: ROOT_PKG } = getRootPackageJson()
  const { json: PKG } = getPackageJson()
  let bumpOptions: Partial<BumpConfig>

  const rcPath = checkConfigRcExist()

  if (rcPath) {
    try {
      const rc = fs.readJsonSync(rcPath, 'utf-8')
      bumpOptions = camelcaseKeys(rc)
    } catch {
      throw new TypeError('Invalid .bumprc file, should be valid JSON file')
    }
  } else {
    bumpOptions = camelcaseKeys(PKG.bump || ROOT_PKG.bump || {})
  }

  logOption(bumpOptions)

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
  const doPublish = bumpOptions.publish || false

  // git
  const createGitTag = bumpOptions.tag || true
  const doGitPush = bumpOptions.push || true
  const commitMessage = bumpOptions.commitMessage || 'release: v${NEW_VERSION}'
  const allowedBranches = bumpOptions.allowedBranches
  const tagPrefix = bumpOptions.tagPrefix || 'v'
  const withTags = bumpOptions.withTags || false
  const remoteTags = bumpOptions.remoteTags || false

  // changelog
  const isChangelogOptions = typeof bumpOptions.changelog === 'object'
  const shouldGenerateChangeLog = isChangelogOptions
    ? (bumpOptions.changelog as ChangelogOptions).enable
    : bumpOptions.changelog || false
  const overrideChangelogOptions = isChangelogOptions
    ? bumpOptions.changelog
    : {}

  // monorepo
  const mode = bumpOptions.mode || 'independent'
  const packages = bumpOptions.packages || []

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
    // extra
    overrideChangelogOptions,
  }
}
