import { $, fs, path } from 'zx'

import { ROOT_WORKSPACE_DIR } from '../constants/path.js'
import { memoReturnValueAsyncFunction } from './memo.js'

export type PackageManager = 'pnpm' | 'yarn' | 'npm'
const LOCKS: Record<string, PackageManager> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
}

export const detectPackage = memoReturnValueAsyncFunction(async () => {
  const root = ROOT_WORKSPACE_DIR
  let manager: PackageManager = 'npm'
  for (const lock of Object.keys(LOCKS)) {
    const isExist = await fs.pathExists(path.join(root, lock))
    if (isExist) {
      manager = LOCKS[lock]
      break
    }
  }

  if (!manager) {
    for (const managerName of Object.values(LOCKS)) {
      const res = await $`${managerName} --version`.nothrow()
      if (res.exitCode === 0) {
        manager = managerName
        break
      }
    }
  }
  if (!manager) {
    // fallback to npm
    const npmVersion = await $`npm -v`.nothrow()
    if (npmVersion.exitCode === 0) {
      manager = 'npm'
    }
  }

  return manager
})
