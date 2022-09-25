import { chalk, path } from 'zx'
import { findPackageJSONPath } from '../utils/find-package.js'

export const PACKAGE_PATH = findPackageJSONPath(
  // prevent ncc transform cwd path
  process.env.INIT_CWD || String(process.cwd()),
)

export const WORKSPACE_DIR = path.dirname(PACKAGE_PATH)

export const CONFIG_RC_PATH = path.join(WORKSPACE_DIR, '.bumprc')

console.log(`Workspace dir: ${chalk.yellow(WORKSPACE_DIR)}`)
