import conventionalChangelog from 'conventional-changelog'
import { fs, path } from 'zx'

import { WORKSPACE_DIR } from '../constants/path.js'

export const generateChangeLog = (
  options?: Parameters<typeof conventionalChangelog>[0],
) => {
  return new Promise<string>((resolve) => {
    let changelog = ''
    conventionalChangelog({
      preset: 'angular',
      releaseCount: 0,
      skipUnstable: false,
      ...options,
    })
      .on('data', (chunk: any) => {
        changelog += chunk.toString()
      })
      .on('end', () => {
        resolve(changelog)
      })
  })
}

export const isExistChangelogFile = () => {
  return ['changelog.md', 'changelog', 'CHANGELOG', 'CHANGELOG.md'].reduce(
    (filename, currentFilename) => {
      return fs.existsSync(path.resolve(WORKSPACE_DIR, currentFilename))
        ? currentFilename
        : filename
    },
    '',
  )
}
