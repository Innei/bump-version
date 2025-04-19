import { join } from 'node:path'
import { URL } from 'node:url'
import { describe, expect, it } from 'vitest'

import { findPackageJSONPath } from '../../src/utils/find-package.js'

// /Users/innei/git/innei-repo/bump-version/test
const __dirpath = join(new URL(import.meta.url).pathname, '../..')

// /Users/innei/git/innei-repo/bump-version/test/packages

describe('find package', () => {
  it('should find package.json cwd is root path', () => {
    expect(findPackageJSONPath(process.cwd())).toEqual(
      join(process.cwd(), 'package.json'),
    )
  })

  it('should find monorepo package.json cwd is package path', () => {
    expect(
      findPackageJSONPath(
        join(join(__dirpath, 'packages/core'), 'packages/core'),
      ),
    ).toEqual(join(join(__dirpath, 'packages/core'), 'package.json'))
  })

  it('should find monorepo package.json cwd is root path', () => {
    expect(findPackageJSONPath(join(__dirpath, 'packages/core'))).toEqual(
      join(join(__dirpath, 'packages/core'), 'package.json'),
    )
  })
})
