import { fs } from 'zx'
import { CONFIG_RC_PATH, ROOT_CONFIG_RC_PATH } from '../constants/path.js'
import type { BumpOptions } from '../interfaces/options.js'
import { camelcaseKeys } from '../utils/camelcase-keys.js'
import { getPackageJson, getRootPackageJson } from '../utils/pkg.js'

// FIXME: rc priority: 1. monorepo rc file 2. root rc file 3. monorepo package field 4. root package field
const checkConfigRcExist = () => {
  return fs.existsSync(CONFIG_RC_PATH)
    ? CONFIG_RC_PATH
    : fs.existsSync(ROOT_CONFIG_RC_PATH)
    ? ROOT_CONFIG_RC_PATH
    : false
}

export const resolveConfig = () => {
  // FIXME monorepo read pkg json issue
  const { json: ROOT_PKG } = getRootPackageJson()
  const { json: PKG } = getPackageJson()
  let bumpOptions: Partial<BumpOptions>

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

  __DEV__ && console.log('bumpOptions', bumpOptions)

  // define options
  const leadingHooks = bumpOptions.leading || bumpOptions.before || []
  const taildingHooks =
    bumpOptions.trailing ||
    (bumpOptions as any).tailing ||
    bumpOptions.after ||
    []

  // npm
  const doPublish = bumpOptions.publish || false

  // git
  const createGitTag = bumpOptions.tag || true
  const doGitPush = bumpOptions.push || true
  const commitMessage = bumpOptions.commitMessage || 'release: v${NEW_VERSION}'
  const allowedBranches = bumpOptions.allowedBranches
  const tagPrefix = bumpOptions.tagPrefix || 'v'

  // changelog
  const shouldGenerateChangeLog = bumpOptions.changelog || false

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
  }
}
