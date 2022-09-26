import { chalk, path } from 'zx'

import { findPackageJSONPath } from '../utils/find-package.js'
import { resolveArgs } from '../core/resolve-args.js'

const { filter } = resolveArgs()
// TODO
export const PACKAGE_PATH = findPackageJSONPath(
  // prevent ncc transform cwd path
  process.env.INIT_CWD || String(process.cwd()),
  filter,
)

export const ROOT_WORKSPACE_DIR = path.dirname(
  findPackageJSONPath(process.env.INIT_CWD || String(process.cwd())),
)

export const WORKSPACE_DIR = path.dirname(PACKAGE_PATH)

export const CONFIG_RC_PATH = path.join(ROOT_WORKSPACE_DIR, '.bumprc')

console.log(`Workspace dir: ${chalk.yellow(WORKSPACE_DIR)}`)
console.log(`Root workspace dir: ${chalk.yellow(ROOT_WORKSPACE_DIR)}`)
