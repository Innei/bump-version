import type { ReleaseType } from 'semver'
import { describe, expect, it } from 'vitest'

import { getNextVersionWithTags } from '../../src/utils/version.js'

// prettier-ignore
const tags = [
  '0.1.5',         '0.2.0',         '0.2.2',
  '0.2.3',         '0.2.4',         '0.2.5',
  '0.2.6',         '0.3.0',         '0.3.1',
  '1.0.0',         '1.0.0-alpha.0', '1.0.0-alpha.1',
  '1.0.0-alpha.2', '1.0.0-alpha.3', '1.0.0-alpha.4',
  '1.0.0-alpha.5', '1.0.0-alpha.6', '1.0.0-alpha.7',
  '1.0.0-beta.0',  '1.0.0-beta.1',  '1.0.1',
  '1.0.2',         '1.1.0',         '1.1.1-alpha.0',
  '1.1.1-alpha.1', '1.1.1-alpha.2', '1.2.0',
  '1.2.1',         '1.3.0',         '1.3.0-alpha.0',
  '1.3.1',         '1.3.2',
  '1.3.4',         '1.4.0',         '1.4.0-alpha.0'
]

describe.each<[string, string, ReleaseType, (string[] | undefined)?]>([
  ['0.1.5', '2.0.0', 'major'],
  ['1.3.1', '1.3.5', 'patch'],
  ['0.1.5', '0.4.0', 'minor'],
  ['0.1.5', '0.4.0-alpha.0', 'preminor'],
  ['1.3.1', '1.3.5-alpha.0', 'prepatch'],
  ['0.1.5', '2.0.0-alpha.0', 'premajor'],
  ['1.3.1-alpha.0', '1.3.5-alpha.0', 'prepatch'],
  ['1.3.1-alpha.0', '1.3.1-alpha.1', 'prerelease'],
  // prettier-ignore
  ['1.3.1', '1.3.3-alpha.0', 'prerelease', ['1.3.1-alpha.0', '1.3.1-alpha.2', '1.3.2-alpha.2']],
  // prettier-ignore
  ['1.3.1', '1.3.3-alpha.0', 'prepatch', ['1.3.1-alpha.0', '1.3.1-alpha.2', '1.3.2-alpha.2']],
  ['1.3.1-alpha.0', '1.3.1-alpha.1', 'prerelease', []],
  ['1.3.1', '1.3.2-alpha.0', 'prerelease', []],
])(
  'test version utils',
  (currentVersion, expectVersion, releaseType, _tags) => {
    it(`${currentVersion}, releaseType: ${releaseType}`, () => {
      const result = getNextVersionWithTags({
        currentVersion,
        tags: _tags || tags,
        releaseType,
      })
      expect(result).toBe(expectVersion)
    })
  },
)
