import conventionalChangelog from 'conventional-changelog'
import { fs, path } from 'zx'

export const generateChangeLog = () => {
  return new Promise<string>((resolve) => {
    let changelog = ''
    conventionalChangelog({
      preset: 'angular',
      releaseCount: 0,
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
      return fs.existsSync(path.resolve(process.cwd(), currentFilename))
        ? currentFilename
        : filename
    },
    '',
  )
}
