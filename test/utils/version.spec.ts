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
  '1.3.1',         '1.3.2',         '1.3.3',
  '1.3.4',         '1.4.0',         '1.4.0-alpha.0'
]

describe.only('test version utils', () => {
  it('should get the next version', () => {
    const currentVersion = '1.3.1'
    const result = getNextVersionWithTags({
      currentVersion,
      tags,
      releaseType: 'patch',
    })
    expect(result).toBe(31)
  })
})
