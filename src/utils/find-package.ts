import { fs, path } from 'zx'

/**
 * Find the nearest package.json file path
 */
export const findPackageJSONPath = (
  dir: string,
  // e.g. packages/core
  packagePath?: string,
): string => {
  const nextDir = (() => {
    if (packagePath) {
      return dir.endsWith(packagePath)
        ? dir.replace(new RegExp(`${packagePath}$`), '')
        : dir
    }

    return dir
  })()

  const packageJSONPath = path.join(nextDir, packagePath || '', 'package.json')
  if (fs.existsSync(packageJSONPath)) {
    return packageJSONPath
  }
  const parentDir = path.dirname(dir)

  if (parentDir === dir) {
    throw new Error('package.json not found')
  }
  return findPackageJSONPath(parentDir, packagePath)
}

// dir: /Users/innei/git/innei-repo/bump-version/packages/core
// packagePath: packages/core
// package json: /Users/innei/git/innei-repo/bump-version/packages/core/package.json
