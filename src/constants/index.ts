import { path } from 'zx'
import { findPackageJSONPath } from '../utils/find-package.js'

export const PACKAGE_DIR = findPackageJSONPath(
  process.env.INIT_CWD || String(process.cwd()),
)

export const WORKSPACE_DIR =
  // prevent ncc transform cwd path

  path.dirname(PACKAGE_DIR)
