import { fs, path } from 'zx'

/**
 * Find the nearest package.json file path
 */
export const findPackageJSONPath = (dir: string): string => {
  const packageJSONPath = path.join(dir, 'package.json')
  if (fs.existsSync(packageJSONPath)) {
    return packageJSONPath
  }
  const parentDir = path.dirname(dir)

  if (parentDir === dir) {
    throw new Error('package.json not found')
  }
  return findPackageJSONPath(parentDir)
}
