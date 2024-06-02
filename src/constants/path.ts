import { path } from 'zx'

import { resolveArgs } from '../core/resolve-args.js'
import { findPackageJSONPath } from '../utils/find-package.js'

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
